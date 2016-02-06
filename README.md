# mithril.exitable.js

Exit animations for Mithril components: provide controllers with an `exit` hook which will trigger when the component disappears from the virtual DOM (but before it's removed from live DOM), locking the draw process while you perform animations.

***

Exports a patched version of Mithril whose controllers gain a new exit hook to allow for outgoing animations.

When you bind an `exit` method to a controller, we observe the output of each global draw: as soon as we detect that the corresponding component has been removed from the view, the draw loop is frozen. exit functions are passed a reference to their component's live DOM root, and should return a thennable that resolves when you've completed your animations.

[Check out this fiddle for a simple demo](https://jsfiddle.net/barney/5ecr8gnj/1), and [see this extended demo](https://jsfiddle.net/barney/xko3kdaL/) for an example of entry & exit animating Mithril components – more demos to come…

ES6 module reads easier and better shows the mechanisms at work.

ES3 version doesn't require compilation, but demands a Map polyfill – I recommend [Andrea Giammarchi's ES6 collections](https://github.com/WebReflection/es6-collections); this script file replaces `window.m`.

```javascript
// Example of an exit function using jQuery:
// Receives the component's root node(s),
// Returns a thennable that resolves when animation has completed 
( el =>
  Promise( end =>
    $( el )
      .animate( {
        height : 0 
      }, 600 )
      .then( end )
  ) )

// Many sensible animation libraries return thennables from animation calls anyway, so actually
( el =>
  Velocity( el, {
    height : 0 
  }, 600 ) )
```
