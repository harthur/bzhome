Handlebars.registerPartial("bug_tooltip", "bug {{bug.id}} - " + 
  "{{bug.status}}{{#if bug.resolution.length}} {{bug.resolution}}{{/if}} - " + 
  "{{bug.summary}} (updated {{timeago bug.last_change_time}})"
);

Handlebars.registerHelper('show_bug', function(id) {
   return bzhome.base + "/show_bug.cgi?id=" + id;
});

Handlebars.registerHelper('show_comment', function(id, comment) {
   return bzhome.base + "/show_bug.cgi?id=" + id + "#c" + comment;
})

Handlebars.registerHelper('show_attach', function(id, action) {
   action = action || "diff";
   return bzhome.base + "/attachment.cgi?id=" + id + "&action=" + action;
})

Handlebars.registerHelper('timeago', function(date) {
   return $.timeago(date);
});

Handlebars.registerHelper('linkify', function(text) {
   return linkify(text).replace(/bug (\d+)/g, "<a href=" + bzhome.base + "/show_bug.cgi?id=$1>$&</a>")
})

Handlebars.registerHelper('format_events', function(block) {
   // limit events showing per bug to 4
   this.events = this.events.slice(0, 1);
   return block(this);
})

Handlebars.registerHelper('format_comment', function(comment, block) {
   var lines = comment.text.split("\n");
   lines = lines.filter(function(line) {
      return line && !line.match(/^(>|----)/);
   })
   
   var match;
   if (match = /Created attachment (\d+)/.exec(lines[0])) {
      comment.created = {id: match[1], title: lines[1]};
      lines = lines.slice(2);
   }
   if (match = /In reply to (.+) from comment #(\d+)/.exec(lines[0])) {
      comment.replyTo = {
         name: match[1].replace(/[\[\(].+[\]\)]/, ""),
         id: match[2]
      };
      lines = lines.slice(1);
   }
   if (match = /Comment on attachment (\d+)/.exec(lines[0])) {
      comment.commentOn = {id: match[1], title: lines[1]};
      lines = lines.slice(2);
   }
   if (match = /Review of attachment (\d+)/.exec(lines[0])) {
      comment.reviewOf = match[1];
      lines = lines.slice(1);
   }
   var text = lines.join("  "),
       crop = 150;
   comment.fullText = text;

   if (text.length > crop) {
      text = text.slice(0, crop) + "...";
   }
   comment.text = text;

   return block(comment);
});

Handlebars.registerHelper('format_name', function(name) {
   // remove nick from "Heather [:harth]"
   return name.replace(/[\[\(].+[\]\)]/, "")
})


Handlebars.registerHelper('if_bugid', function(field, block) {
  // 'blocks' and 'depends on' fields are bug ids that can be linkified
  if (["blocks", "depends_on"].indexOf(field) >= 0) {
     return block(this);
  }
  return block.inverse(this);
});

Handlebars.registerHelper('field', function(name, block) {
   // 'assigned_to' -> 'assigned to'
   var name = name.replace("_", " ").replace("attachment.", "")
   if (name) {
      return name + ":";
   }
});

Handlebars.registerHelper('format_change', function(block) {
   var change = this;
       regex = /(.+)(\((.+)\))/;

   if (change.field_name == "flag") {
      // review?(x) review+ -> review+ x
      if (change.added == "review+" || change.added == "feedback+") {
         var name = change.removed.match(regex)[2];
         change.added += name;
         change.removed = "";
      }
      var match;
      if (match = change.added.match(regex)) {
         change.added = match[1] + " " + match[3];
      }
      if (match = change.removed.match(regex)) {
         change.removed = match[1] + " " + match[3];
         change.added = change.added || '""';
      }
      change.field_name = "";
   }
   return block(change);
});

Handlebars.registerHelper('format_changes', function(block) {
   var changes = this.changes;
   // coalesce 'status' and 'resolution' changes
   this.changes = this.changes.filter(function(reso, index) {
      var status = changes[index - 1];
      if (status && status.field_name == "status"
         && reso.field_name == "resolution") {
          status.removed += " " + reso.removed;
          status.added += " " + reso.added;
          status.field_name = "";
          return false;
      }
      return true;
   });
   return block(this);
});