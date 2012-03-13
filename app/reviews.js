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
   
   window.Feedbacks = Reviews.extend({
     localStorage: new Store("bzhome-feedbacks")
   });
   
   window.reviews = new Reviews;
   window.feedbacks = new Feedbacks;  
   
   window.ReviewRow = Backbone.View.extend({
      tagName: "div",

      className: "review-item",

      template: Handlebars.compile($("#review-item").html()),
   
      render: function() {
         $(this.el).html(this.template(this.model.toJSON()));
         return this;
      }
   });

   window.ReviewList = Backbone.View.extend({
      el: $("#reviews"),

      list: $("#reviews-list"),    

      type: "reviews",

      initialize: function() {
         var collection = this.collection
           = (this.type == "feedback" ? feedbacks : reviews);

         collection.bind("add", this.addReview, this);
         collection.bind("reset", this.render, this);

         // get cached list from localStorage
         collection.fetch();

         // but fetch from the server and update
         var type = this.type;
         bzhome.user.requests(function(err, requests) {
            var items = type == "feedback" ? requests.feedbacks
                          : requests.reviews;    
            collection.reset(items);
         });
      },

      render: function(reviews) {
         this.list.empty();
         this.collection.each(_(this.addReview).bind(this));
         if (this.collection.length) {
            this.el.find(".count").html(this.collection.length);
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
   
   window.FeedbackList = ReviewList.extend({
      el: $("#feedbacks"),
      list: $("#feedbacks-list"),
      type: "feedback"
   });
});