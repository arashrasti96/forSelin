const choiceArea = document.querySelector("#choice-area");
const noButton = document.querySelector("#no-button");
const yesButton = document.querySelector("#yes-button");
const questionCard = document.querySelector(".question-card");
const answerMessage = document.querySelector("#answer-message");

const state = {
  position: { x: 0, y: 0 },
  home: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  pointer: null,
  lastEvadedAt: performance.now(),
  dimensions: { width: 0, height: 0, buttonWidth: 0, buttonHeight: 0 },
};

const PAGE_PADDING = 16;
const MAGNET_RADIUS = 130;
const MAX_SPEED = 32;
const RETURN_DELAY = 2000;
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getArena() {
  return {
    centerX: state.dimensions.width / 2,
    centerY: state.dimensions.height / 2,
    radiusX: Math.max(
      1,
      (state.dimensions.width - state.dimensions.buttonWidth - PAGE_PADDING * 2) / 2,
    ),
    radiusY: Math.max(
      1,
      (state.dimensions.height - state.dimensions.buttonHeight - PAGE_PADDING * 2) / 2,
    ),
  };
}

function keepButtonInsideArena() {
  const arena = getArena();
  const buttonCenterX = state.position.x + state.dimensions.buttonWidth / 2;
  const buttonCenterY = state.position.y + state.dimensions.buttonHeight / 2;
  const normalizedX = (buttonCenterX - arena.centerX) / arena.radiusX;
  const normalizedY = (buttonCenterY - arena.centerY) / arena.radiusY;
  const boundaryDistance = Math.hypot(normalizedX, normalizedY);

  if (boundaryDistance <= 1) {
    return null;
  }

  const correctedCenterX = arena.centerX + (normalizedX / boundaryDistance) * arena.radiusX;
  const correctedCenterY = arena.centerY + (normalizedY / boundaryDistance) * arena.radiusY;
  const inwardX = arena.centerX - correctedCenterX;
  const inwardY = arena.centerY - correctedCenterY;
  const inwardLength = Math.hypot(inwardX, inwardY) || 1;

  state.position.x = correctedCenterX - state.dimensions.buttonWidth / 2;
  state.position.y = correctedCenterY - state.dimensions.buttonHeight / 2;

  return {
    x: inwardX / inwardLength,
    y: inwardY / inwardLength,
  };
}

function updateDimensions() {
  const buttonRect = noButton.getBoundingClientRect();

  state.dimensions = {
    width: window.innerWidth,
    height: window.innerHeight,
    buttonWidth: buttonRect.width,
    buttonHeight: buttonRect.height,
  };

  keepButtonInsideArena();
}

function placeNoButton() {
  noButton.style.transform = `translate(${state.position.x}px, ${state.position.y}px)`;
}

function updateHomePosition() {
  const choiceAreaRect = choiceArea.getBoundingClientRect();
  const currentPosition = { ...state.position };

  state.home.x = clamp(
    choiceAreaRect.right - state.dimensions.buttonWidth - 14,
    PAGE_PADDING,
    state.dimensions.width - state.dimensions.buttonWidth - PAGE_PADDING,
  );
  state.home.y = clamp(
    choiceAreaRect.bottom - state.dimensions.buttonHeight - 22,
    PAGE_PADDING,
    state.dimensions.height - state.dimensions.buttonHeight - PAGE_PADDING,
  );
  state.position.x = state.home.x;
  state.position.y = state.home.y;
  keepButtonInsideArena();
  state.home.x = state.position.x;
  state.home.y = state.position.y;
  state.position = currentPosition;
}

function initializeButtonPosition() {
  noButton.style.left = "0";
  noButton.style.top = "0";
  updateDimensions();
  updateHomePosition();
  state.position.x = state.home.x;
  state.position.y = state.home.y;
  keepButtonInsideArena();
  placeNoButton();
}

function applyMagneticForce() {
  if (!state.pointer) {
    return;
  }

  const buttonRect = noButton.getBoundingClientRect();
  const buttonCenterX = buttonRect.left + buttonRect.width / 2;
  const buttonCenterY = buttonRect.top + buttonRect.height / 2;
  let differenceX = buttonCenterX - state.pointer.x;
  let differenceY = buttonCenterY - state.pointer.y;
  let distance = Math.hypot(differenceX, differenceY);

  if (distance >= MAGNET_RADIUS) {
    return;
  }

  if (distance < 1) {
    const angle = Math.random() * Math.PI * 2;
    differenceX = Math.cos(angle);
    differenceY = Math.sin(angle);
    distance = 1;
  }

  const closeness = 1 - distance / MAGNET_RADIUS;
  const force = 1 + closeness ** 2 * 15 + (distance < 36 ? 8 : 0);

  state.velocity.x += (differenceX / distance) * force;
  state.velocity.y += (differenceY / distance) * force;
  state.lastEvadedAt = performance.now();

  return closeness;
}

function applyArenaEscape(closeness = 0) {
  if (!closeness) {
    return;
  }

  const arena = getArena();
  const buttonCenterX = state.position.x + state.dimensions.buttonWidth / 2;
  const buttonCenterY = state.position.y + state.dimensions.buttonHeight / 2;
  const normalizedX = (buttonCenterX - arena.centerX) / arena.radiusX;
  const normalizedY = (buttonCenterY - arena.centerY) / arena.radiusY;
  const boundaryDistance = Math.hypot(normalizedX, normalizedY);
  const edgeProximity = clamp((boundaryDistance - 0.78) / 0.22, 0, 1);

  if (!edgeProximity) {
    return;
  }

  const inwardX = arena.centerX - buttonCenterX;
  const inwardY = arena.centerY - buttonCenterY;
  const inwardLength = Math.hypot(inwardX, inwardY) || 1;
  const edgeBoost = (8 + closeness * 16) * edgeProximity ** 2;

  state.velocity.x += (inwardX / inwardLength) * edgeBoost;
  state.velocity.y += (inwardY / inwardLength) * edgeBoost;
}

function limitSpeed() {
  const speed = Math.hypot(state.velocity.x, state.velocity.y);

  if (speed > MAX_SPEED) {
    state.velocity.x = (state.velocity.x / speed) * MAX_SPEED;
    state.velocity.y = (state.velocity.y / speed) * MAX_SPEED;
  }
}

function nudgeNoButton(speed) {
  const angle = Math.random() * Math.PI * 2;

  state.velocity.x = Math.cos(angle) * speed;
  state.velocity.y = Math.sin(angle) * speed;
  state.lastEvadedAt = performance.now();
}

function isNearNoButton(x, y) {
  const buttonRect = noButton.getBoundingClientRect();
  const padding = 44;

  return (
    x >= buttonRect.left - padding &&
    x <= buttonRect.right + padding &&
    y >= buttonRect.top - padding &&
    y <= buttonRect.bottom + padding
  );
}

function startTouchEvasion() {
  if (!isTouchDevice) {
    return;
  }

  const hop = () => {
    if (!document.body.classList.contains("is-answered")) {
      nudgeNoButton(7 + Math.random() * 7);
    }

    window.setTimeout(hop, 850 + Math.random() * 950);
  };

  window.setTimeout(hop, 700);
}

function returnHomeWhenSafe() {
  if (performance.now() - state.lastEvadedAt < RETURN_DELAY) {
    return;
  }

  const distanceX = state.home.x - state.position.x;
  const distanceY = state.home.y - state.position.y;
  const distance = Math.hypot(distanceX, distanceY);

  if (distance < 12) {
    state.position.x = state.home.x;
    state.position.y = state.home.y;
    state.velocity.x = 0;
    state.velocity.y = 0;
    return;
  }

  state.velocity.x = distanceX * 0.11;
  state.velocity.y = distanceY * 0.11;
}

function moveNoButton() {
  const closeness = applyMagneticForce();
  applyArenaEscape(closeness);
  returnHomeWhenSafe();
  limitSpeed();

  state.velocity.x *= 0.82;
  state.velocity.y *= 0.82;
  state.position.x += state.velocity.x;
  state.position.y += state.velocity.y;

  const inwardDirection = keepButtonInsideArena();

  if (inwardDirection) {
    state.velocity.x = inwardDirection.x * 10;
    state.velocity.y = inwardDirection.y * 10;
  }

  placeNoButton();
  requestAnimationFrame(moveNoButton);
}

window.addEventListener("pointermove", (event) => {
  state.pointer = {
    x: event.clientX,
    y: event.clientY,
  };
});

window.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" && !isTouchDevice) {
    return;
  }

  if (isNearNoButton(event.clientX, event.clientY)) {
    nudgeNoButton(44 + Math.random() * 12);
  }
});

window.addEventListener("blur", () => {
  state.pointer = null;
});

yesButton.addEventListener("click", () => {
  document.body.classList.add("is-answered");
  answerMessage.textContent = "Excellent. The adventure is officially on.";
  yesButton.textContent = "Yay!";
});

window.addEventListener("resize", updateDimensions);
questionCard.addEventListener("animationend", updateHomePosition, { once: true });

initializeButtonPosition();
requestAnimationFrame(moveNoButton);
startTouchEvasion();