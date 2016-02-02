import m from 'mithril'

// Registry of controllers and corresponding root nodes
let roots = new Map()

// Register views to bind their roots to the above
const register = view =>
  function registeredView( ctrl ){
    const output = view( ...arguments )
    const { attrs : { config } } = output
    
    if( ctrl.exit )
      attrs.config = function superConfig( el ){
        roots.set( ctrl, el )
      
        if( config )
          return config.call( this, ...arguments )
      }
    
    return output
  }

// Root components (those mounted or routed) are the source of redraws.
// Before they draw, there is no stateful virtual DOM.
// Therefore their view execution is the source of all truth in what is currently rendered.
const root = ( { view, ...component } ) =>
  Object.assign( component, {
    view : function rootView(){
      // All previously registered exitable components are saved here
      const previous = Array.from( roots )
      
      // Then we reset
      roots.clear()
      
      // Execute the view, registering all exitables
      let output   = register( view ).call( this, ...arguments )
      
      // Now, set up a list of confirmed exits
      const exits    = []
      
      // For every previous exitable instance...
      for( let [ ctrl, el ] of previous )
        // ...if it hasn't re-registered...
        if( !roots.has( ctrl ) )
          // It's gone! Call the exit method and keep its output.
          exits.push( ctrl.exit( el ) )
      
      // If we have exits...
      if( exits.length ){
        // Noop this draw
        output = { subtree : 'retain' }
        
        // ...and all subsequent ones...
        m.startComputation()
        
       
        // ...until all exits have resolved
        Promise.all( exits ).then( m.endComputation )
      }
      
      return output
    }
  } )

// Helper: transform each value in an object. Even in ES7, this is painfully contrived.
const reduce = ( object, transformer ) =>
  Object.keys( object ).reduce(
    ( output, key ) =>
      Object.assign( output, {
        [ key ] : transformer( object[ key ] )
      } ),
    {}
  )

// Export a patched Mithril API
export default Object.assign(
  // Core m function needs to sniff out components...
  function m(){
    const output = m( ...arguments )
    
    output.children.forEach( child => {
      const { view } = child

      if( view )
        // ...and get their views to register controllers and root nodes
        Object.assign( child, {
          view : register( view )
        } )
    } )
    
    return output
  },
  
  // Then we have all the m methods 
  m,
  
  // Mount and Route need to register root components for snapshot logic
  {
    mount : ( el, component ) =>
      m.mount( el, root( component ) ),
    
    route( el, path, map ){
      if( map ){
        return m.route( el, path, reduce( root ) )
      }
      else {
        return m.route( ...arguments )
      }
    }
  }
)
