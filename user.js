function sortByTime(event1, event2) {
   return new Date(event2.time) > new Date(event1.time);   
}

function User(username) {
   var client = bz.createClient({
      username: username
   });

   return {
      bugzilla: client,

      assigned: function(callback) {
        client.searchBugs({
           status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
           email1: username,
           email1_type: "equals",
           email1_assigned_to: 1,
           include_fields: 'id,summary,status,resolution,last_change_time',
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
            
            reviews.sort(sortByTime);
            feedbacks.sort(sortByTime);
            
            callback(null, { reviews: reviews, feedbacks: feedbacks });
         });   
      },

      recent: function(daysAgo, callback, bugCallback) { 
         // get most recently changed CCed or assigned bugs
         client.searchBugs({
            email1: username,
            email1_type: "equals",
            email1_cc: 1,
            email1_assigned_to: 1,
            changed_after: utils.dateString(daysAgo),
            order: "changeddate DESC",
            limit: 20,
            include_fields: 'id,summary,status,resolution,last_change_time'
         },
         function(err, bugs) {
            if (err) {
               return callback(err);
            }
            bugs.forEach(function(bug) {
               client.getBug(bug.id, {
                  include_fields: 'id,summary,status,resolution,history,comments,last_change_time'
               },
               function(error, bug) {
                  if (error) {
                     return bugCallback(error);
                  }
                  var events = [];

                  var history = bug.history;
                  history.reverse(); // newest to oldest
                  for (var i = 0; i < history.length; i++) {
                     var changeset = history[i],
                         time = changeset.change_time;

                     if (new Date(time) < utils.dateAgo(daysAgo)) {
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

                     if (new Date(time) < utils.dateAgo(daysAgo)) {
                        break;
                     }
                     events.push({
                        time: time,
                        comment: comment,
                        author: comment.creator
                     });
                  }
                  events.sort(sortByTime);
                  return bugCallback(null, {bug: bug, events: events});
               }) // getBug()
            }) // forEach
            callback(null, bugs);
         }) // searchBugs()
      }
   }
}