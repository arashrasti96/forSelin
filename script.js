const choiceArea = document.querySelector("#choice-area");
const noButton = document.querySelector("#no-button");
const yesButton = document.querySelector("#yes-button");
const moreTimeButton = document.querySelector("#more-time-button");
const questionCard = document.querySelector(".question-card");
const answerMessage = document.querySelector("#answer-message");
const noMessage = document.querySelector("#no-message");
const storyOverlay = document.querySelector("#story-overlay");
const storyText = document.querySelector("#story-text");
const storyNext = document.querySelector("#story-next");
const celebrationOverlay = document.querySelector("#celebration-overlay");
const celebrationClose = document.querySelector("#celebration-close");
const pressureOverlay = document.querySelector("#pressure-overlay");
const pressureClose = document.querySelector("#pressure-close");

const state = {
  position: { x: 0, y: 0 },
  home: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  pointer: null,
  lastEvadedAt: performance.now(),
  noAttempts: 0,
  storyStep: 0,
  storyTimer: null,
  roamAngle: Math.random() * Math.PI * 2,
  speedBoostUntil: 0,
  dimensions: { width: 0, height: 0, buttonWidth: 0, buttonHeight: 0 },
};

const PAGE_PADDING = 16;
const MAGNET_RADIUS = 130;
const MAX_SPEED = 30;
const BOOSTED_MAX_SPEED = 44;
const RETURN_DELAY = 2000;
const ROAM_SPEED = 1.35;
const BOOSTED_ROAM_SPEED = 2.8;
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const noResponses = ["نه صبر کن!", "یادم رفت از اون یکی گیف خوشت میاد. بذار جابجاشون کنم"];
const storyResponses = [
  "ببین من دوباره میام سراغت اگه بگی نه",
  "من تو چیزهایی که می‌خوام کوتاه نمیام و من تو رو می‌خوام!",
];
const ambientNoWarnings = [
  "روی اون \u2066No\u2069 کلیک نکنیا!",
  "اگه رو \u2066No\u2069 کلیک کنی سیستمت هک میشه 😂",
  "شوخی، \u2066No PRESSURE!!\u2069",
];
const emailEndpoint = "https://formsubmit.co/ajax/arash.rasty.ar@gmail.com";
const interactionCounterKey = "forSelin-interaction-count";
const yesVideoSource = document.querySelector("#yes-button source");
const yesVideoElement = document.querySelector("#yes-button video");

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
    choiceAreaRect.right - state.dimensions.buttonWidth,
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
  const force = 1 + closeness ** 2 * 20 + (distance < 36 ? 11 : 0);

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
  const maxSpeed = performance.now() < state.speedBoostUntil ? BOOSTED_MAX_SPEED : MAX_SPEED;

  if (speed > maxSpeed) {
    state.velocity.x = (state.velocity.x / speed) * maxSpeed;
    state.velocity.y = (state.velocity.y / speed) * maxSpeed;
  }
}

function isNoButtonIdle() {
  return (
    storyOverlay.hidden &&
    celebrationOverlay.hidden &&
    pressureOverlay.hidden &&
    !document.body.classList.contains("is-answered")
  );
}

function maintainRoam() {
  if (!isTouchDevice || !isNoButtonIdle()) {
    return;
  }

  const isBoosted = performance.now() < state.speedBoostUntil;
  const roamSpeed = isBoosted ? BOOSTED_ROAM_SPEED : ROAM_SPEED;

  state.roamAngle += (Math.random() - 0.5) * (isBoosted ? 0.24 : 0.15);
  state.velocity.x += Math.cos(state.roamAngle) * roamSpeed;
  state.velocity.y += Math.sin(state.roamAngle) * roamSpeed;
}

function reflectOffBoundary(inwardDirection) {
  const normalX = -inwardDirection.x;
  const normalY = -inwardDirection.y;
  const dot = state.velocity.x * normalX + state.velocity.y * normalY;

  state.velocity.x = (state.velocity.x - 2 * dot * normalX) * 0.85;
  state.velocity.y = (state.velocity.y - 2 * dot * normalY) * 0.85;
  state.roamAngle = Math.atan2(state.velocity.y, state.velocity.x);
}

function keepNoAwayFromChoices() {
  const choices = [yesButton, moreTimeButton];
  const gap = 10;
  const maximumX = state.dimensions.width - state.dimensions.buttonWidth - PAGE_PADDING;
  const maximumY = state.dimensions.height - state.dimensions.buttonHeight - PAGE_PADDING;

  for (const choice of choices) {
    const choiceRect = choice.getBoundingClientRect();
    const overlapsX =
      state.position.x < choiceRect.right + gap &&
      state.position.x + state.dimensions.buttonWidth > choiceRect.left - gap;
    const overlapsY =
      state.position.y < choiceRect.bottom + gap &&
      state.position.y + state.dimensions.buttonHeight > choiceRect.top - gap;

    if (!overlapsX || !overlapsY) {
      continue;
    }

    const exits = [
      { x: choiceRect.left - gap - state.dimensions.buttonWidth, y: state.position.y, axis: "x" },
      { x: choiceRect.right + gap, y: state.position.y, axis: "x" },
      { x: state.position.x, y: choiceRect.top - gap - state.dimensions.buttonHeight, axis: "y" },
      { x: state.position.x, y: choiceRect.bottom + gap, axis: "y" },
    ].filter((exit) => exit.x >= PAGE_PADDING && exit.x <= maximumX && exit.y >= PAGE_PADDING && exit.y <= maximumY);

    if (exits.length === 0) {
      continue;
    }

    exits.sort((first, second) =>
      Math.hypot(first.x - state.position.x, first.y - state.position.y) -
      Math.hypot(second.x - state.position.x, second.y - state.position.y),
    );

    const exit = exits[0];
    state.position.x = exit.x;
    state.position.y = exit.y;
    if (exit.axis === "x") {
      state.velocity.x *= -0.65;
    } else {
      state.velocity.y *= -0.65;
    }
  }
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

function moveNoButtonAway(x, y) {
  state.speedBoostUntil = performance.now() + 5000;
  state.pointer = { x, y };
  const closeness = applyMagneticForce();
  applyArenaEscape(closeness);
  limitSpeed();
  state.pointer = null;
}

function swapYesButtonMedia(useNoVideo) {
  yesVideoSource.src = useNoVideo ? "no.MOV" : "yes.webm";
  yesVideoSource.type = useNoVideo ? "video/quicktime" : "video/webm";
  yesVideoElement.load();
}

function showNoResponse() {
  const responseIndex = Math.min(state.noAttempts, noResponses.length - 1);

  noMessage.textContent = noResponses[responseIndex];
  noMessage.classList.add("is-visible");

  if (responseIndex === 1) {
    swapYesButtonMedia(true);
  }
}

function showStory(step) {
  state.storyStep = step;
  storyText.textContent = storyResponses[step];
  storyNext.textContent = step === 0 ? "بعدی" : "بازگشت";
  storyOverlay.hidden = false;
}

function resetStory() {
  window.clearTimeout(state.storyTimer);
  state.storyTimer = null;
  state.noAttempts = 0;
  noMessage.textContent = "";
  noMessage.classList.remove("is-visible");
  storyOverlay.hidden = true;
  state.position.x = state.home.x;
  state.position.y = state.home.y;
  state.velocity.x = 0;
  state.velocity.y = 0;
  placeNoButton();
}

function resetTransientState() {
  resetStory();
  celebrationOverlay.hidden = true;
  pressureOverlay.hidden = true;
  document.body.classList.remove("is-answered");
  answerMessage.textContent = "";
  noMessage.textContent = "";
  noMessage.classList.remove("is-visible");
  state.pointer = null;
  state.lastEvadedAt = performance.now();
  state.speedBoostUntil = 0;
  state.position.x = state.home.x;
  state.position.y = state.home.y;
  state.velocity.x = 0;
  state.velocity.y = 0;
  placeNoButton();
}

function showAmbientWarning(text) {
  if (state.noAttempts > 0 || !isNoButtonIdle()) {
    return;
  }

  noMessage.textContent = text;
  noMessage.classList.add("is-visible");
}

function hideAmbientWarning() {
  if (state.noAttempts > 0 || !isNoButtonIdle()) {
    return;
  }

  noMessage.textContent = "";
  noMessage.classList.remove("is-visible");
}

function scheduleAmbientWarnings() {
  window.setTimeout(() => showAmbientWarning(ambientNoWarnings[0]), 4000);
  window.setTimeout(() => showAmbientWarning(ambientNoWarnings[1]), 9000);
  window.setTimeout(() => showAmbientWarning(ambientNoWarnings[2]), 14000);
  window.setTimeout(hideAmbientWarning, 19000);
}

function handleNoAttempt(x, y) {
  if (!isNearNoButton(x, y) || !storyOverlay.hidden) {
    return;
  }

  moveNoButtonAway(x, y);
  showNoResponse();
  state.noAttempts += 1;

  if (state.noAttempts === 2) {
    window.clearTimeout(state.storyTimer);
    state.storyTimer = window.setTimeout(() => showStory(0), 2000);
  }
}

function sendInteractionEmail(button) {
  let counts = {};

  try {
    counts = JSON.parse(window.localStorage.getItem(interactionCounterKey) || "{}");
  } catch {
    counts = {};
  }

  counts[button] = Number(counts[button] || 0) + 1;
  const count = counts[button];

  try {
    window.localStorage.setItem(interactionCounterKey, JSON.stringify(counts));
  } catch {
    // Continue sending the notification when browser storage is unavailable.
  }
  const formData = new URLSearchParams({
    _subject: `For Selin: ${button} clicked ${count} time${count === 1 ? "" : "s"}`,
    _template: "table",
    button,
    times: String(count),
  });

  window.fetch(emailEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: formData.toString(),
  }).catch(() => {});
}

function showCelebration() {
  celebrationOverlay.hidden = false;
}

function returnHomeWhenSafe() {
  if (isTouchDevice || performance.now() - state.lastEvadedAt < RETURN_DELAY) {
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
  maintainRoam();
  limitSpeed();

  state.velocity.x *= 0.86;
  state.velocity.y *= 0.86;
  state.position.x += state.velocity.x;
  state.position.y += state.velocity.y;

  const inwardDirection = keepButtonInsideArena();

  if (inwardDirection) {
    reflectOffBoundary(inwardDirection);
  }
  keepNoAwayFromChoices();

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
  handleNoAttempt(event.clientX, event.clientY);
});

window.addEventListener("blur", () => {
  state.pointer = null;
});

yesButton.addEventListener("click", () => {
  document.body.classList.add("is-answered");
  showCelebration();
});

moreTimeButton.addEventListener("click", () => {
  sendInteractionEmail("Need more time");
  pressureOverlay.hidden = false;
});

storyNext.addEventListener("click", () => {
  if (state.storyStep === 0) {
    showStory(1);
    return;
  }

  sendInteractionEmail("No");
  resetStory();
});

celebrationClose.addEventListener("click", () => {
  sendInteractionEmail("Yes");
  celebrationOverlay.hidden = true;
});

pressureClose.addEventListener("click", resetTransientState);

window.addEventListener("resize", updateDimensions);
questionCard.addEventListener("animationend", updateHomePosition, { once: true });

initializeButtonPosition();
requestAnimationFrame(moveNoButton);
scheduleAmbientWarnings();