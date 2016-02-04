**Pre v1** — see issues for outstanding issues

***

# mithril.exitable.js
Exit animations for Mithril components: provide controllers with an `exit` hook which will trigger when the component disappears from the virtual DOM (but before it's removed from live DOM), locking the draw process while you perform animations.

***

Exports a patched version of Mithril whose controllers gain a new exit hook to allow for outgoing animations.

When you bind an `exit` method to a controller, we observe the output of each global draw: as soon as we detect that the corresponding component has been removed from the view, the draw loop is frozen. exit functions are passed a reference to their component's live DOM root, and should return a thennable that resolves when you've completed your animations.

```javascript
// Example of an exit function:
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
  $( el ).animate( {
    height : 0 
  }, 600 ) )
```
