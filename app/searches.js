$(function() {
   window.Search = Backbone.Model.extend({      
      name: '',
      query: {},
      open: null,
      closed: null
   });

   window.Searches = Backbone.Collection.extend({
      model: Search,
      localStorage: new Store("bzhome-searches")  
   });

   window.SearchRow = Backbone.View.extend({
      tagName: "div",

      className: "search-item",

      template: Handlebars.compile($("#search-item").html()),
      
      events: {
         "click .search-delete": "clear"
      },
      
      initialize: function() {
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
      },
   
      render: function() {
         $(this.el).html(this.template(this.model.toJSON()));
         return this;
      },
      
      remove: function() {
         $(this.el).remove();
      },
      
      clear: function() {
         this.model.destroy();
      }
   });
   
   window.searches = new Searches;

   window.SearchList = Backbone.View.extend({
      el: $("#searches"),
      
      form: $("#new-search-form"),
      
      events: {
         "click #add-search-plus": "showForm",
         "click #add-search-cancel": "hideForm",
         "submit #new-search-form": "submit"
      },

      initialize: function() {
         searches.bind("add", this.addSearch, this);
         searches.bind("reset", this.render, this);
         
         // get list from localStorage
         searches.fetch();
         
         if (!searches.length) {
            searches.create({
               name: 'Assigned',
               query: {
                  email1: bzhome.email,
                  emailtype1: "equals",
                  emailassigned_to1: 1,
                  query_format: "advanced"
               }
            });
         }
         
         $("#new-search-form").hide();
      },

      render: function() {
         searches.each(_(this.addSearch).bind(this));
      },

      addSearch: function(search) {
         var view = new SearchRow({
            model: search
         });
         $("#searches-list").append(view.render().el);
         
         var openQuery = _({status: bzhome.openStatus})
                            .extend(search.get("query"));
         bzhome.user.client.countBugs(openQuery, function(err, count) {
            search.set({
               open: count
            });
         });
         var closedQuery = _({status: bzhome.closedStatus})
                              .extend(search.get("query"));
         bzhome.user.client.countBugs(closedQuery, function(err, count) {
            search.set({
               closed: count
            });
         });
      },
      
      submit: function(event) {
         event.preventDefault();

         this.hideForm();

         var url = $("#search-url").val();

         searches.create({
            name: $("#search-name").val(),
            query: utils.queryFromUrl(url)
         });
      },
      
      hideForm: function() {
         this.form.hide();
      },
      
      showForm: function() {
         this.form.show();
      }
   });
});