describe('Auto fetching', function() {
  var Person, server;

  beforeEach(function() {
    Person = SC.Resource.define({
      url: '/people',
      schema: {
        id:       Number,
        name:     String
      },
    });

    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  describe('of models', function() {
    var person;

    beforeEach(function() {
      server.respondWith("GET", "/people/1",
                         [200, { "Content-Type": "application/json" },
                         '{ "id": 1, "name": "Mick Staugaard" }']);
      person = Person.create({id: 1});
    });

    it('getting known attributes should not schedule a fetch', function() {
      spyOn(person, 'fetch');
      runs(function() {
        expect(person.get('id')).toBe(1);
      });

      waits(100);

      runs(function() {
        expect(person.fetch).not.toHaveBeenCalled();
      });
    });

    it('getting unknown attributes should not schedule a fetch', function() {
      runs(function() {
        expect(person.get('name')).toBeUndefined();
      });

      waits(100);

      runs(function() {
        server.respond();
        expect(person.get('name')).toBe('Mick Staugaard');
      });
    });
  });

  describe('of collections', function() {
    var people;

    beforeEach(function() {
      server.respondWith("GET", "/people",
                         [200, { "Content-Type": "application/json" },
                         '[{ "id": 1, "name": "Mick Staugaard" }]']);
      people = SC.ResourceCollection.create({type: Person});
      server.respond();
    });

    it('should not fetch on creation', function() {
      var hasFetched = false;
      var TestCollection = SC.ResourceCollection.extend({
        fetch: function() {
          hasFetched = true;
        }
      });

      runs(function() {
        people = TestCollection.create({type: Person});
      });

      waits(100);

      runs(function() {
        expect(hasFetched).toBe(false);
      });
    });

    describe('that are fetched', function() {
      beforeEach(function() {
        people.fetch();
        server.respond();

        waitsFor(function() {
          return people.get('length') > 0;
        }, 'collection never fetched', 1000);

        runs(function() {
          server.restore();
          server = sinon.fakeServer.create();
          server.respondWith("GET", "/people",
                             [200, { "Content-Type": "application/json" },
                             '[{ "id": 1, "name": "Mick Staugaard" }, { "id": 2, "name": "Shajith Chacko" }]']);
        });
      });

      it('should not be refetched', function() {
        runs(function() {
           people.fetch();
           server.respond();
        });

        waits(1000);

        runs(function() {
          expect(people.get('length')).toBe(1);
        });
      });

      describe('and expired', function() {
        beforeEach(function() {
          runs(function() {
            people.expire();
          });

          waitsFor(function() {
            return people.get('isExpired');
          }, 'collection never expired', 1000);
        });

        it('should refetch', function() {
          waitsFor(function() {
            server.respond();
            return people.get('length') === 2;
          }, 'collection never refetched', 2000);
        });
      });
    });

  });

});
