describe('Lifecycle', function() {
  var Person, server;

  beforeEach(function() {
    Person = SC.Resource.define({
      url: '/people',
      schema: {
        id:       Number,
        name:     String
      }
    });

    server = sinon.fakeServer.create();
    server.respondWith("GET", "/people/1",
                       [200, { "Content-Type": "application/json" },
                       '{ "id": 1, "name": "Mick Staugaard" }']);
  });

  afterEach(function() {
    server.restore();
  });

  describe('new object', function() {
    var person;
    beforeEach(function() {
      person = Person.create({id: 1});
    });

    it('should be in the UNFETCHED state', function() {
      expect(person.get('resourceState')).toBe(SC.Resource.Lifecycle.UNFETCHED);
    });

    it('should not be expired', function() {
      expect(person.get('isExpired')).toBe(false);
    });

    it('should never expire', function() {
      expect(person.get('expireAt')).toBeUndefined();
    });

    it('should be fetchable', function() {
      expect(person.get('isFetchable')).toBe(true);
    });
  });

  describe('fetching', function() {
    var person;
    beforeEach(function() {
      person = Person.create({id: 1});
      person.fetch();
    });

    it('should put the object in a FETCHING state', function() {
      expect(person.get('resourceState')).toBe(SC.Resource.Lifecycle.FETCHING);
    });

    describe('is done', function() {
      beforeEach(function() {
        server.respond();
      });

      it('should put the object in a FETCHED state when the fetch is done', function() {
        expect(person.get('resourceState')).toBe(SC.Resource.Lifecycle.FETCHED);
      });

      it('should set expiry in 5 minutes', function() {
        var fiveMinutesFromNow = new Date();
        fiveMinutesFromNow.setSeconds(fiveMinutesFromNow.getSeconds() + (60 * 5));

        expect(person.get('expireAt')).toBeDefined();
        expect(person.get('expireAt').getTime()).toBeCloseTo(fiveMinutesFromNow.getTime(), 1000);
      });
    });

  });

  describe('expiry', function() {
    var person;

    beforeEach(function() {
      person = Person.create({id: 1});
    });

    it('should be expired with an expireAt in the past', function() {
      var expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() - 1);
      person.set('expireAt', expiry);
      expect(person.get('isExpired')).toBe(true);
      expect(person.get('resourceState')).toBe(SC.Resource.Lifecycle.EXPIRED);
    });

    it('should be expired with an expireAt in the future', function() {
      var expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      person.set('expireAt', expiry);
      expect(person.get('isExpired')).toBe(false);
      expect(person.get('resourceState')).toBe(SC.Resource.Lifecycle.UNFETCHED);
    });

    it('should expire when "expire" is called', function() {
      expect(person.get('isExpired')).toBe(false);
      person.expire();
      waitsFor(function() {
        return person.get('isExpired');
      }, 'person never expired', 1000);
    });
  });

});
