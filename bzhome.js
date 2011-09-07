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
      event.preventDefault();

      var [product, component] = $("#file-form .component-search").val().split("/");
      window.open(bzhome.base + "/enter_bug.cgi?"
                  + "product=" + encodeURIComponent(product) + "&"
                  + "component=" + encodeURIComponent(component));
   });
   
   $("#search-form").submit(function(event) {
      event.preventDefault();

      var [product, component] = $("#search-form .component-search").val().split("/");      
      window.open(bzhome.base + "/buglist.cgi?"
                  + "order=Last%20Changed&order=changeddate%20DESC" 
                  + "&product=" + encodeURIComponent(product) 
                  + "&component=" + encodeURIComponent(component));
      
   });
   $("#search-bugs").hide();
});

var bzhome = {
   daysAgo: 5,

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
      bzhome.user = User(email, bzhome.daysAgo);

      bzhome.populate();
   },

   populate : function() {
      bzhome.populateAutocomplete();
      bzhome.populateReviews();
      bzhome.populateAssigned();

      bzhome.fetchRecent();
   },
   
   fetchRecent : function() {
      $("#timeline .content").html("<img src='lib/indicator.gif' class='spinner'></img>");
      
      var recent = [];

      async.parallel([
         function(done) {
            bzhome.user.bugs(['cced', 'assigned'], function(err, bugs) {
               recent = recent.concat(bugs);
               done();
            })
         },
         function(done) {            
            var components = JSON.parse(localStorage['components'] || '[]');

            async.forEach(components, function(comp, done) {
               bzhome.user.component(comp.product, comp.component, function(err, bugs) {
                  recent = recent.concat(bugs);
                  done();
               })
            }, function(err) {
               done();
            })  
         },
      ], function(err) {
         // create timeline after all bugs have been fetched
         bzhome.populateTimeline(recent);
      });
   },
   
   populateTimeline : function(bugs) {
      try {
         var timelineBug = Handlebars.compile($("#timeline-bug").html());
      } catch(e) {
         console.log(e)
      }
      
      // remove duplicate bugs
      var unique = {};
      bugs.forEach(function(bug) {
         unique[bug.id] = bug;
      })
      bugs = _(unique).toArray();

      var recent = $("#timeline .content");
      recent.empty();
      
      bugs.sort(function(bug1, bug2) {
         return new Date(bug2.last_change_time) > new Date(bug1.last_change_time);   
      })

      for (var i = 0; i < bugs.length; i++) {
         var html = timelineBug({ bug: bugs[i] });
         recent.append(html);
      }
      $(".timeago").timeago();
      
      // fetch the recent events for each bug asynchronously
      bugs.forEach(bzhome.populateEvents);
   },
   
   populateEvents : function(bug) {
      try {
         var bugEvents = Handlebars.compile($("#bug-events").html());
      } catch(e) {
         console.log(e)
      }
      
      bzhome.user.bugzilla.getBug(bug.id, {
         include_fields: 'id,summary,status,resolution,history,comments,last_change_time'
      }, function(err, bug) {
         if (err) {
            return console.log(error);
         }
         var events = [];

         var history = bug.history;
         history.reverse(); // newest to oldest
         for (var i = 0; i < history.length; i++) {
            var changeset = history[i],
                time = changeset.change_time;

            if (new Date(time) < utils.dateAgo(bzhome.daysAgo)) {
               break;
            }          
            events.push({
               time: time,
               changeset: changeset,
               author: changeset.changer
            });
         }

         var comments = bug.comments;
         comments.reverse(); // newest to oldest
         for (var i = 0; i < comments.length; i++) {
            var comment = comments[i],
                time = comment.creation_time;

            if (new Date(time) < utils.dateAgo(bzhome.daysAgo)) {
               break;
            }
            events.push({
               time: time,
               comment: comment,
               author: comment.creator
            });
         }
         events.sort(utils.byTime);
      
         var html = bugEvents({bug: bug, events:events});
         $("#" + bug.id).append(html);

         $(".timeago").timeago();
      });
   },

   populateReviews : function() {
      try {
         var reviewItem = Handlebars.compile($("#review-item").html());
      } catch(e) {
         console.log(e)
      }
      
      var reviews = $("#reviews .content");
      reviews.html("<img src='lib/indicator.gif' class='spinner'></img>");

      bzhome.user.requests(function(err, requests) {
         reviews.empty();
         $("#reviews .count").html(requests.reviews.length);

         requests.reviews.forEach(function(request) {
            var html = reviewItem(request);
            reviews.append(html);
         })
         $(".timeago").timeago();
      });
   },
   
   populateAssigned: function() {
      try {
         var assignedBug = Handlebars.compile($("#assigned-bug").html());
      } catch(e) {
         console.log(e)
      }

      var assigned = $("#assigned .content");
      assigned.html("<img src='lib/indicator.gif' class='spinner'></img>");

      bzhome.user.assigned(function(err, bugs) {
         assigned.empty();
         $("#assigned .count").html(bugs.length);

         bugs.forEach(function(bug) {
            var html = assignedBug({ bug: bug });
            assigned.append(html);
         })
         $(".timeago").timeago();
      });
   },
  
   populateAutocomplete : function() {      
      bzhome.user.bugzilla.getConfiguration({
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
         
         $(".component-search").autocomplete({
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
         });
      });
   }
};
