
function User(username, daysAgo) {
   var client = bz.createClient({
      username: username
   });

   var fields = 'id,summary,status,resolution,last_change_time';

   return {
      bugzilla: client,

      bugs: function(methods, callback) {
         var query = {
            email1: username,
            email1_type: "equals",
            order: "changeddate DESC",
            limit: 20,
            changed_after: utils.dateAgo(daysAgo),
            include_fields: fields
         };

         if (methods.indexOf('cced') >= 0) {
            query['email1_cc'] = 1;
         }
         if (methods.indexOf('assigned') >= 0) {
            query['email1_assigned_to'] = 1;
         }
         if (methods.indexOf('reporter') >= 0) {
            query['email1_reporter'] = 1;
         }
         client.searchBugs(query, callback);
      },
      
      component: function(product, component, callback) {
         client.searchBugs({
            product: product,
            component: component,
            include_fields: fields,
            limit: 20,
            changed_after: utils.dateAgo(daysAgo),
            order: "changeddate DESC",
         }, callback);
      },
      
      assigned: function(callback) {
        client.searchBugs({
           status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
           email1: username,
           email1_type: "equals",
           email1_assigned_to: 1,
           include_fields: fields,
           order: "changeddate DESC",
        }, callback);
      },
 
      requests: function(callback) {
         var reviews = [],
            feedbacks = [];

         client.searchBugs({ 
            'field0-0-0': 'flag.requestee',
            'type0-0-0': 'equals',
            'value0-0-0': username,
            include_fields: 'id,summary,status,resolution,last_change_time,attachments'
         },
         function(err, bugs) {
            if (err) {
               return callback(err);
            }

            bugs.forEach(function(bug) {
               // only add attachments with this user as requestee
               bug.attachments.forEach(function(att) {
                  if (att.is_obsolete || !att.flags) {
                     return;
                  }
                  att.flags.forEach(function(flag) {
                     var name = username.replace(/@.+/, ""); // can't get full email if not logged in
                     if (flag.requestee && flag.requestee.name == name
                         && flag.status == "?") {
                        var request = {
                           flag: flag,
                           attachment: att,
                           bug: bug,
                           time: att.last_change_time
                        };

                        if (flag.name == "review") {
                           reviews.push(request);
                        }
                        else if (flag.name == "feedback") {
                           feedbacks.push(request);
                        }
                     }
                  });                   
               });
            });
            
            reviews.sort(utils.byTime);
            feedbacks.sort(utils.byTime);
            
            callback(null, { reviews: reviews, feedbacks: feedbacks });
         });   
      }
   }
}