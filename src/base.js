(function() {

  window.Ember = window.Ember || window.SC;

  window.Ember.Resource = Ember.Object.extend({
    resourcePropertyWillChange: window.Ember.K,
    resourcePropertyDidChange: window.Ember.K
  });
  
}());