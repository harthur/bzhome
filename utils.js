var utils = {
   dateAgo : function(daysAgo) {
      daysAgo = daysAgo || 0;
      var dayMs = 1000 * 60 * 60 * 24;
      return new Date(Date.now() - (dayMs * daysAgo));   
   },

   dateString : function(daysAgo) {
      var date = utils.dateAgo(daysAgo);
      return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
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
   
   byTime : function(event1, event2) {
      return new Date(event2.time) > new Date(event1.time);   
   }
}