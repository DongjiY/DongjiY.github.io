const MAX_EXPANDED = -200; // in px
const MIN_EXPANDED = 0;
const RESISTANCE_FACTOR = 0.1; // smaller number means you have to drag further to open/close and vice versa

let start_x_pos;

/**
 * Initializes the starting x position because we want to calculate relative distance swiped not absolute
 * @param {TouchEvent} e - The touch event detected by browser
 */
function handleTouchStart(e) {
  start_x_pos = e.changedTouches[0].clientX;
}

/**
 * Checks the distance that the user has dragged finger across the screen and adjusts the
 * swipeable element's position based on that distance.
 * @param {TouchEvent} e - The touch event detected by browser
 */
function handleTouchMove(e) {
  const CURRENT_OFFSET = Number(
    e.target
      .closest(".swipeable")
      .style.transform.substring(
        11,
        e.target.closest(".swipeable").style.transform.length - 3
      )
  );

  const offset = Math.min(
    MIN_EXPANDED,
    Math.max(
      MAX_EXPANDED,
      CURRENT_OFFSET +
        (e.changedTouches[0].clientX - start_x_pos) * RESISTANCE_FACTOR
    )
  );

  const animatedOffset =
    easeInOutSine(Math.abs(offset / MAX_EXPANDED)) * MAX_EXPANDED;

  e.target.closest(
    ".swipeable"
  ).style.transform = `translateX(${animatedOffset}px)`;
}

/**
 * When the user removes finger from screen, checks the current position of the swipeable element
 * snaps the swipeable element to the side of the bounding box that it is closest to
 * @param {TouchEvent} e - The touch event detected by browser
 */
function snapToBoundingBox(e) {
  const CURRENT_OFFSET = Number(
    e.target
      .closest(".swipeable")
      .style.transform.substring(
        11,
        e.target.closest(".swipeable").style.transform.length - 3
      )
  );

  if (CURRENT_OFFSET < MAX_EXPANDED / 2) {
    e.target.closest(
      ".swipeable"
    ).style.transform = `translateX(${MAX_EXPANDED}px)`;
  } else {
    e.target.closest(
      ".swipeable"
    ).style.transform = `translateX(${MIN_EXPANDED}px)`;
  }
}

/**
 * Calculates position on an ease in-out sine curve
 * @param {number} x -  A percentage of the way through your action is.
 * @returns {number}
 */
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
