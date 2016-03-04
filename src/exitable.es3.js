window.m = ( function( mithril ){
  // Registry of controllers and corresponding root nodes
  var roots     = new Map()
  // A record of recent view outputs for every root-level component
  var history   = new WeakMap()
  // Whether the current draw is being used to revert to its previous state
  var reverting = false

  // Register views to bind their roots to the above
  // so we can provide exit animations with the right DOM reference
  function register( view ){
    return function registeredView( ctrl ){
      var output = view.apply( this, arguments )

      // In case of a registered exit animation...
      if( ctrl.exit ){
        var node = output

        // If the view output is an array, deal with the first element
        while( node.length )
          node = node[ 0 ]

        var config = node.attrs.config

        // Map the root / first child element to the component instance
        node.attrs.config = function superConfig( el ){
          roots.set( ctrl, el )

          if( config )
            return config.apply( this, arguments )
        }
      }

      return output
    }
  }

  // Root components (those mounted or routed) are the source of redraws.
  // Before they draw, there is no stateful virtual DOM.
  // Therefore their view execution is the source of all truth in what is currently rendered.
  function root( component ){
    var view = component.view

    component.view = rootView

    return component

    function rootView( ctrl ){
      // If we are in the middle of a reversion, we just want to patch
      // Mithril's internal virtual DOM HEAD to what it was before the
      // last output
      if( reverting )
        return history.get( ctrl )

      // All previously registered exitable components are saved here
      var previous = array( roots )

      // Then we reset
      roots.clear()

      // Execute the view, registering all exitables
      var output   = register( view ).apply( this, arguments )

        // Record the output, we will need to return to this state if the next draw has exits
      history.set( ctrl, output )

      // Now, set up a list of confirmed exits
      var exits    = []

      // For every previous exitable instance...
      for( var i = 0; i < previous.length; i++ )
        // ...if it hasn't re-registered...
        if( !roots.has( previous[ i ][ 0 ] ) )
          // It's gone! Call the exit method and keep its output.
          exits.push( previous[ i ][ 0 ].exit( previous[ i ][ 1 ] ) )


      // If we have exits...
      if( exits.length ){
        // Noop this draw
        output = { subtree : 'retain' }

        // ...and all subsequent ones...
        mithril.startComputation()

        // ...until all exits have resolved
        mithril.sync( exits ).then( function(){
          // We now need to revert Mithril's internal virtual DOM head so that
          // it will correctly patch the live DOM to match the state in which
          // components are removed: it currently believes that already happend
          // Because it ran the diff before we told it to retain the subtree at
          // the last minute
          reverting = true

          // Next draw should not patch, only diff
          mithril.redraw.strategy( 'none' )

          // Force a synchronous draw despite being frozen
          mithril.redraw( true )

          // Now it's as if we were never here to begin with
          reverting = false

          // Resume business as usual
          mithril.endComputation()
        } )
      }

      return output
    }
  }

  // Helper: transform each value in an object. Even in ES7, this is painfully contrived.
  function reduce( object, transformer ){
    var output = {}

    for( var key in object )
      if( Object.prototype.hasOwnProperty.call( object, key ) )
        output[ key ] = transformer( object[ key ] )

    return output
  }

  // Helper: array from map
  function array( map ){
    var array   = []
    var entries = map.entries()

    while( true ){
      var entry = entries.next()

      if( entry.done )
        break

      array.push( entry.value )
    }

    return array
  }

  // Core m function needs to sniff out components...
  function m( first ){
    if( first.view )
      return m.component.apply( this, arguments )

    var output = mithril.apply( this, arguments )

    for( var i = 0; i < output.children.length; i++ )
      if( output.children[ i ].view )
        // ...and get their views to register controllers and root nodes
        output.children[ i ].view = register( output.children[ i ].view )

    return output
  }

  // Then we have all the m methods
  for( var key in mithril )
    if( Object.prototype.hasOwnProperty.call( mithril, key ) )
      m[ key ] = mithril[ key ]

  // m.component invocations produce virtual DOM.
  // We need to intercede to get at the view.
  m.component = function( component ){
    component.view = register( component.view )

    // I don't know how I coped without ES6 spread operator....
    return mithril.component.apply( mithril, [ component ].concat( [].slice.call( arguments, 1 ) ) )
  }

  // Mount and Route need to register root components for snapshot logic
  m.mount = function( el, component ){
    return mithril.mount( el, root( component ) )
  }

  m.route = function( el, path, map ){
    if( map ){
      return mithril.route( el, path, reduce( map, root ) )
    }
    else {
      return mithril.route.apply( this, arguments )
    }
  }

  // Export a patched Mithril API
  return m
}( m ) );
