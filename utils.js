var utils = {
   dateAgo : function(daysAgo) {
      daysAgo = daysAgo || 0;
      var dayMs = 1000 * 60 * 60 * 24;
      return new Date(Date.now() - (dayMs * daysAgo));   
   },

   dateString : function(daysAgo) {
      var date = utils.dateAgo(daysAgo);
      return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
   },
   
   queryString : function() {
      var vars = window.location.search.substring(1).split("&"),
          query = {};
      for (var i = 0; i < vars.length; i++) {
         var pair = vars[i].split("=");
         query[pair[0]] = unescape(pair[1]);
      }
      return query;
   },
   
   smallSpinner : function(elem) {
      var opts = {
        lines: 8, // The number of lines to draw
        length: 2, // The length of each line
        width: 2, // The line thickness
        radius: 2, // The radius of the inner circle
        color: '#000', // #rbg or #rrggbb
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false // Whether to render a shadow
      };
      return new Spinner(opts).spin(elem);
   }
}