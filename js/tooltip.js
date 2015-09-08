/**
 * @fileOverview Informational tooltip.
 **/

/**
 * @namespace
 * Wrapper for tooltip functions.
 */
var learningTooltip = {
    
    /**
     * Message displayed by the tooltip.
     */
    tooltipMessage: "CHANGE THIS",

    /**
     * How far off the center should the tooltip be?
     */
    xOffset: 7,

    /**
     * How far off the center should the tooltip be?
     */
    yOffset: 10,

    /**
     * Updates the tooltip's message.
     *
     * @param {string} newMessage The message to change the tooltip to.
     */
    updateMessage: function(newMessage){

      learningTooltip.tooltipMessage = newMessage;

      // Update the text node if it currently exists
      var textNodeDiv = document.getElementById("textNodeDiv");
      if( textNodeDiv ) {
        var tooltipTextNode = document.createTextNode(learningTooltip.tooltipMessage);
        textNodeDiv.removeChild(textNodeDiv.firstChild);
        textNodeDiv.appendChild(tooltipTextNode);
      }
    },

    /**
     * Function to call when 
     */
    mouseLeave: function() {
      $("#tooltip").hide();
    },

    /**
     * Function to call when the mouse enters an area where the tooltip
     * should be displayed.
     */
    mouseEnter: function(message) {
      learningTooltip.updateMessage(message);
      $("#tooltip").show();
    },

    /**
     * Add hover listeners to all elements with the "data-tooltip-hover-message"
     * attribute.
     */
    addHoverListeners: function() {
      $("[data-tooltip-hover-message]")
        .mouseenter(function(ev){
          var message = ev.target.getAttribute("data-tooltip-hover-message");
          learningTooltip.mouseEnter(message);
        })
        .mouseleave(function(ev){
          learningTooltip.mouseLeave();
        });
    },

    /**
     * Create and display the tooltip if the mouse is over something that calls
     * "mouseIn".
     */
    startTooltip: function(){

      var bodyElement = document.getElementsByTagName("body")[0];

      // Create the tooltip element
      var tooltipMessageElement = document.createElement("div");
      tooltipMessageElement.setAttribute("id", "tooltip");
      tooltipMessageElement.style.display = "none";

      // Add the message as a text node to the tooltip element
      var messageDiv = document.createElement("div");
      messageDiv.setAttribute("id", "textNodeDiv");
      var tooltipTextNode = document.createTextNode(learningTooltip.tooltipMessage);
      messageDiv.appendChild(tooltipTextNode); // So we can refer to this later.
      tooltipMessageElement.appendChild(messageDiv);

      var bodyElement = document.getElementsByTagName("body")[0];
      bodyElement.appendChild(tooltipMessageElement);

      // Move the tooltip when the mouse moves
      bodyElement.addEventListener('mousemove',
        function(e){
            var t = document.getElementById("tooltip");
            if( t ) {
              t.style.top = (e.pageY - learningTooltip.xOffset) + "px";
              t.style.left = (e.pageX + learningTooltip.yOffset) + "px";
            }
      });
    }
};
