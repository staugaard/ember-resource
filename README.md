This project has been forked. The canonical repository is now located at: [https://github.com/zendesk/ember-resource][1].

# Ember-Resource [![Build Status](https://secure.travis-ci.org/staugaard/ember-resource.png)](http://travis-ci.org/staugaard/ember-resource)

A simple library to connect your Ember.js application to JSON backends.

## The Mandatory Todo Appplication

I've created a modified version of the todo application that the Ember.js Tutorial walks you through.
https://github.com/staugaard/sproutcore-resource-todos
This version persists the todo items on the server using a very small sinatra application and MongoDB.

## Examples

We will provide you with some documentation and stuff, but for now here's a little inspiration:

Think about running Wordpress.org. This is the schema you would use:

Assuming that /users/1 returns this JSON:

```javascript
{
  id:   1,
  name: "Mick Staugaard"
}
```

You would use this user model:

```javascript
MyApp.User = Ember.Resource.define({
  url: '/users',
  schema: {
    id:    Number,
    name:  String,
    blogs: {
      type:     Ember.ResourceCollection,
      itemType: 'MyApp.Blog',
      url:      '/users/%@/blogs'
    }
  }
});
```

Assuming that /blogs/1 returns this JSON:

```javascript
{
  id:      1,
  name:    "My awesome blog",
  owner_id: 1
}
```

You would use this blog model:

```javascript
MyApp.Blog = Ember.Resource.define({
  url: '/blogs'
  schema: {
    id:    Number,
    name:  String,
    owner: {
      type: MyApp.User
    },
    posts: {
      type:     Ember.ResourceCollection,
      itemType: 'MyApp.Post',
      url:      '/blogs/%@/posts'
    }
  }
});
```

Assuming that /posts/1 returns this JSON:

```javascript
{
  id:      1,
  title:   "Welcome to the blog",
  body:    "OMG I started a blog!",
  blog_id: 1
}
```

You would use this post model:

```javascript
MyApp.Post = Ember.Resource.define({
  url: '/posts',
  schema: {
    id:    Number,
    title: Sting,
    body:  String,
    blog: {
      type: MyApp.Blog
    },
    comments: {
      type:     Ember.ResourceCollection,
      itemType: 'MyApp.Comment',
      url:      '/posts/%@/comments'
    }
  }
});
```

Assuming that /comments/1 returns this JSON:

```javascript
{
  id:      1,
  body:    "I have something constructive to say.",
  post_id: 1,
  author: {
    id:   2,
    name: "Comment Author"
  }
}
```

You would use this comment model:

```javascript
MyApp.Comment = Ember.Resource.define({
  url: '/comments',
  schema: {
    id:   Number,
    body: String,
    post: {
      type: MyApp.Post
    },
    author: {
      type:   MyApp.User,
      nested: true
    }
  }
});
```

[1]: https://github.com/zendesk/ember-resource
