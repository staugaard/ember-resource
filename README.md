# SproutCore-Resource

A simple library to connect your SproutCore 2.0 application to JSON backends.

## The Mandatory Todo Appplication

I've created a modified version of the todo application that the SproutCore 2.0 Tutorial walks you through.
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
MyApp.User = SC.Resource.define({
  url: '/users',
  schema: {
    id:    Number,
    name:  String,
    blogs: {
      type:     SC.ResourceCollection,
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
MyApp.Blog = SC.Resource.define({
  url: '/blogs'
  schema: {
    id:    Number,
    name:  String,
    owner: {
      type: MyApp.User
    },
    posts: {
      type:     SC.ResourceCollection,
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
MyApp.Post = SC.Resource.define({
  url: '/posts',
  schema: {
    id:    Number,
    title: Sting,
    body:  String,
    blog: {
      type: MyApp.Blog
    },
    comments: {
      type:     SC.ResourceCollection,
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
  body:    "Viagra spam shit",
  post_id: 1,
  author: {
    id:   2,
    name: "Fucking Spammer"
  }
}
```

You would use this comment model:

```javascript
MyApp.Comment = SC.Resource.define({
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
