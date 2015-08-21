// Constructs the expected DOM for the tests

// Initialize the application
document.addEventListener('DOMContentLoaded',
  function() {
    var tagName = "span";
    var body = document.body

    // Create the value elements
    var wood = document.createElement(tagName);
    wood.setAttribute("data-current-value", 500);
    wood.setAttribute("id", "current_wood_value");

    var fixed_suppression = document.createElement(tagName);
    fixed_suppression.setAttribute("data-current-value", 500);
    fixed_suppression.setAttribute("id", "current_fixed_cost_for_suppression");

    var current_marginal_cost_for_suppression = document.createElement(tagName);
    current_marginal_cost_for_suppression.setAttribute("data-current-value", 500);
    current_marginal_cost_for_suppression.setAttribute("id", "current_marginal_cost_for_suppression");

    var current_old_growth_value = document.createElement(tagName);
    current_old_growth_value.setAttribute("data-current-value", 500);
    current_old_growth_value.setAttribute("id", "current_old_growth_value");

    var current_mountain_bike_value = document.createElement(tagName);
    current_mountain_bike_value.setAttribute("data-current-value", 500);
    current_mountain_bike_value.setAttribute("id", "current_mountain_bike_value");

    body.appendChild(wood);
    body.appendChild(fixed_suppression);
    body.appendChild(current_marginal_cost_for_suppression);
    body.appendChild(current_old_growth_value);
    body.appendChild(current_mountain_bike_value);

    // Create the policy elements
    var wind = document.createElement(tagName);
    wind.setAttribute("data-current-value", 500);
    wind.setAttribute("id", "p_current_wind_speed");
    var humidity = document.createElement(tagName);
    humidity.setAttribute("data-current-value", 500);
    humidity.setAttribute("id", "p_current_humidity");
    var date = document.createElement(tagName);
    date.setAttribute("id", "p_current_date");
    date.setAttribute("data-current-value", 500);
    var constant = document.createElement(tagName);
    constant.setAttribute("id", "p_current_constant");
    constant.setAttribute("data-current-value", 500);

    body.appendChild(wind);
    body.appendChild(humidity);
    body.appendChild(date);
    body.appendChild(constant);
  }
);
