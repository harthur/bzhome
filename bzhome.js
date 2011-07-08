$(document).ready(function() {
   bzhome.login();

   var input = $("#login-name");
   input.val(bzhome.email);

   input.blur(function() {
      var email = input.val();
      if (email && email != bzhome.email) {
         bzhome.login(email);
      }
   });

   $("#login-form").submit(function(event) {
      // when the user presses "Enter" in login input
      event.preventDefault();
      input.blur();
   });
   
   $("#file-form").submit(function(event) {
      // when the user presses "Enter" in file bug input
      event.preventDefault();

      var [product, component] = $("#file-component").val().split("/");
      window.open(bzhome.base + "/enter_bug.cgi?" +
                  "product=" + encodeURIComponent(product) + "&" +
                  "component=" + encodeURIComponent(component));
   });
});

var bzhome = {
   base: "https://bugzilla.mozilla.org",
   
   login : function(email) {
      var lsKey = "bzhome-email";
      if (!email) {
         email = utils.queryString()['user'];
         if (!email) {
            email = localStorage[lsKey];
            if (!email) {
               $("#content").hide();
               return;               
            }
         }
      }
      $("#content").show();

      localStorage[lsKey] = email;
      bzhome.email = email;

      bzhome.populate();
   },

   populate : function() {
      try {
         var timelineItem = Handlebars.compile($("#timeline-item").html()),
             reviewItem = Handlebars.compile($("#review-item").html()),
             assignedItem = Handlebars.compile($("#assigned-item").html());
      } catch(e) {
         // handlebars throws mysterious errors
         console.log(e)
      }

      var user = User(bzhome.email);
      
      user.bugzilla.getConfiguration({
         flags: 0,
         cached_ok: 1
      },
      function(err, config) {
         var components = [];
         for (product in config.product) {
            var comps = config.product[product].component;
            for (component in comps) {
               var string = product + "/" + component;
               components.push({
                  product: product,
                  component: component,
                  string: string
               });
            }
         }
         $("#file-component").autocomplete({
           list: components,
           minCharacters: 2,
           timeout: 200,
           adjustWidth: 280,
           template: function(item) {
              return "<li value='" + string + "'><span class='product'>"
                 + item.product + "</span>" + "<span class='component'>"
                 + item.component + "</span></li>"
           },
           matcher: function(typed) {
              return typed;
           },
           match: function(item, matcher) {
              var words = matcher.split(/\s+/);
              return _(words).all(function(word) {
                 return item.string.toLowerCase().indexOf(word.toLowerCase()) >= 0;
              });
           },
           insertText: function(item) {
              return item.string;
           }
         })
      });
      
      var reviews = $("#reviews .content");
      reviews.html("<img src='/lib/indicator.gif' class='spinner'></img>");

      user.requests(function(err, requests) {
         reviews.empty();
         $("#reviews .count").html(requests.reviews.length);

         requests.reviews.forEach(function(request) {
            var html = reviewItem(request);
            reviews.append(html);
         })
         $(".timeago").timeago();
      });
      
      var assigned = $("#assigned .content");
      assigned.html("<img src='/lib/indicator.gif' class='spinner'></img>");

      user.assigned(function(err, bugs) {
         assigned.empty();
         $("#assigned .count").html(bugs.length);

         bugs.forEach(function(bug) {
            var html = assignedItem({ bug: bug });
            assigned.append(html);
         })
         $(".timeago").timeago();
      });
      
      var timeline = $("#timeline .content");
      timeline.html("<img src='/lib/indicator.gif' class='spinner'></img>");
      
      user.timeline(1.5, function(err, items) {
        timeline.empty();
        for (var i = 0; i < items.length; i++) {
            var html = timelineItem(items[i]);
            timeline.append(html);
        }
        $(".timeago").timeago();
     });
   }
};
