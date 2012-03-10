$(function() {
   window.Review = Backbone.Model.extend({      
      attachment: null,
      bug: null,
      time: ''
   });

   window.Reviews = Backbone.Collection.extend({
      model: Review,
      localStorage: new Store("bzhome-reviews"),
      
      initialize: function() {
         this.bind("reset", this.resetStore, this);
      },
      
      resetStore: function() {
         Backbone.sync("clear", this);
         Backbone.sync("create", this);
      }
   });

   window.ReviewRow = Backbone.View.extend({
      tagName: "div",

      className: "review-item",

      template: Handlebars.compile($("#review-item").html()),
   
      render: function() {
         $(this.el).html(this.template(this.model.toJSON()));
         return this;
      }
   });
   
   window.reviews = new Reviews;

   window.ReviewList = Backbone.View.extend({
      el: $("#reviews"),
      
      list: $("#reviews-list"),

      initialize: function() {
         reviews.bind("add", this.addReview, this);
         reviews.bind("reset", this.render, this);

         // get cached list from localStorage
         reviews.fetch();

         // but fetch from the server and update
         bzhome.user.requests(function(err, requests) {
            reviews.reset(requests.reviews);
         });
      },

      render: function(reviews) {
         this.list.empty();
         reviews.each(_(this.addReview).bind(this));
         if (reviews.length) {
            $("#reviews .count").html(reviews.length);
            $(".timeago").timeago();            
         }
      },

      addReview: function(review) {
         var view = new ReviewRow({
            model: review
         });
         this.list.append(view.render().el);
      }
   });
});