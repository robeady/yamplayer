import { hot } from 'react-hot-loader/root'
import * as React from 'react'
import Counter from './Counter'
import Player from "./Player"

const x: number = 4

const App = () => (
  <div>
    <h1>Hello, world {x}</ h1>
    <Counter/>
    <br />
    <br />
    <Player />
  </div>
)

export default hot(App)
