/**
 * Get time differences in hours between two dates.
 * @param d1: date 1
 * @param d2: date 2
 * @return {number}
 */
function diffHours (d1, d2) {
  return Math.abs((d2.getTime() - d1.getTime()) / 3600000)
}

module.exports = {
  diffHours
}
