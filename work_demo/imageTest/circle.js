const PI = Math.PI;

var circle = {};

circle.area = function (r) {
  return PI * r * r;
};

circle.circumference = (r) => 2 * PI * r;

module.exports = circle;
