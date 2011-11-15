describe('toJSON', function() {
  var Address = SC.Resource.define({
    schema: {
      id: Number,
      city: String,
    }
  });
  
  var Book = SC.Resource.define({
    schema: {
      id: Number,
      title: String,
      isAvailable: Boolean,
      addedAt: Date,
      additionalInfo: Object
    }
  });
  
  var booksData = [
    {
      id: 1,
      title: 'The Hobbit',
      isAvailable: YES,
      addedAt: new Date().toJSON(),
      additionalInfo: {
        'key': 'value'
      }
    },
    {
      id: 2,
      title: 'Lolita',
      isAvailable: YES,
      addedAt: new Date().toJSON()
    },
    {
      id: 3,
      title: 'Anna Karenina',
      isAvailable: YES,
      addedAt: new Date().toJSON()
    }
  ];
  
  booksData.forEach(function(data) {
    Book.create({}, data);
  })
  
  var addressData = {
    id: 1,
    city: 'Toronto'
  };
  
  Address.create({}, addressData);
  
  it('should invoke toJSON on nested associations', function() {
    var Library = SC.Resource.define({
      schema: {
        name: String,
        
        address: {
          type: Address,
          nested: true
        },
        
        books: {
          type: SC.ResourceCollection,
          itemType: Book,
          nested: true
        }
      }
    });
    
    var data = {
      name: 'The Robarts Library',
      address: addressData,
      books: booksData
    };
    
    var library = Library.create({}, data);
    
    expect(library.toJSON()).toEqual(data);
  });
  
  it('should include only id (or ids) for remote associations by id', function() {
    var Library = SC.Resource.define({
      schema: {
        name: String,
        
        address: {
          type: Address
        },
        
        books: {
          type: SC.ResourceCollection,
          itemType: Book
        }
      }
    });
    
    var data = {
      name: 'The Robarts Library',
      address_id: 1,
      books_ids: [1,2,3]
    };
    
    var library = Library.create({}, data);
    
    expect(library.toJSON()).toEqual(data);
  });
  
  it('should not include remote has many', function() {
    var Library = SC.Resource.define({
      schema: {
        name: String,
        
        address: {
          type: Address,
          nested: true
        },
        
        books: {
          type: SC.ResourceCollection,
          itemType: Book,
          url: '/libraries/%@/books'
        }
      }
    });
    
    var data = {
      name: 'The Robarts Library',
      address: addressData
    };
    
    var library = Library.create({}, data);
    
    SC.setPath(library, 'books.content', [booksData[0]]);
    
    expect(library.toJSON()).toEqual(data);
  });
  
  it('should include attributes as json', function() {
    var book = Book.create({}, booksData[0]);
    
    expect(book.toJSON()).toEqual(booksData[0]);
  })
  
});