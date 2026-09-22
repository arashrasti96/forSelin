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
const MAGNET_RADIUS = 220;
const MAX_SPEED = 52;
const RETURN_DELAY = 2000;

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

  const buttonCenterX = state.position.x + state.dimensions.buttonWidth / 2;
  const buttonCenterY = state.position.y + state.dimensions.buttonHeight / 2;
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
  const force = 2 + closeness ** 1.8 * 24 + (distance < 52 ? 14 : 0);

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
  const edgeProximity = clamp((boundaryDistance - 0.64) / 0.36, 0, 1);

  if (!edgeProximity) {
    return;
  }

  const inwardX = arena.centerX - buttonCenterX;
  const inwardY = arena.centerY - buttonCenterY;
  const inwardLength = Math.hypot(inwardX, inwardY) || 1;
  const edgeBoost = (18 + closeness * 36) * edgeProximity ** 2;

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

  state.velocity.x *= 0.9;
  state.velocity.y *= 0.9;
  state.position.x += state.velocity.x;
  state.position.y += state.velocity.y;

  const inwardDirection = keepButtonInsideArena();

  if (inwardDirection) {
    state.velocity.x = inwardDirection.x * 40;
    state.velocity.y = inwardDirection.y * 40;
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
  if (event.pointerType !== "touch") {
    return;
  }

  state.pointer = {
    x: event.clientX,
    y: event.clientY,
  };

  const closeness = applyMagneticForce();
  applyArenaEscape(closeness);
  limitSpeed();
  state.pointer = null;
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