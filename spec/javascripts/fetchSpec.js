describe('deferred fetch', function() {
  var Person, people, server;

  beforeEach(function() {
    Person = Ember.Resource.define({
      url: '/people',
      schema: {
        id:       Number,
        name:     String
      }
    }).extend({
      autoFetch: false
    });

    server = sinon.fakeServer.create();
    server.respondWith("GET", "/people/1",
                       [200, { "Content-Type": "application/json" },
                       '{ "id": 1, "name": "Mick Staugaard" }']);


  });

  afterEach(function() {
    server.restore();
  });

  describe("fetched() for resources", function() {
    it("should resolve when the fetch completes", function() {
      var handler = jasmine.createSpy();

      var person = Person.create({id: 1});
      person.fetched().done(function() {
        handler();
      });

      person.fetch();
      server.respond();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("fetched() for resource collections", function() {
    beforeEach(function() {
//      window.stopHere = true;
      server.restore();
      server.respondWith("GET", "/people",
                         [200, { "Content-Type": "application/json" },
                         '[{ "id": 1, "name": "Mick Staugaard" }]']);
      people = Ember.ResourceCollection.create({type: Person});

    });

    afterEach(function() {
      window.stopHere = false;
    });

    it("should resolve when the fetch completes", function() {

      var handler = jasmine.createSpy();

      runs(function() {
        people.expire();

        people.fetched().done(function() {
          handler();
        });

        people.fetch();
        server.respond();
      });

      waits(1000);

      runs(function() {
        expect(handler).toHaveBeenCalled();
      });
    });
  });

});
