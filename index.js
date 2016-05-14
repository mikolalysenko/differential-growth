const regl = require('regl')()
const spawnWorker = require('webworkify')
const lookAt = require('gl-mat4/lookAt')
const perspective = require('gl-mat4/perspective')

const meshWorker = spawnWorker(require('./worker'))

const positionBuffer = regl.buffer({usage: 'dynamic'})
const normalBuffer = regl.buffer({usage: 'dynamic'})
const cellBuffer = regl.elements({usage: 'dynamic'})

let targetRadius = 100.0
let radius = 100.0

meshWorker.addEventListener('message', ({data: {
  radius, positions, normals, cells
}}) => {
  targetRadius = radius * 2 + 10
  positionBuffer({data: positions, usage: 'dynamic'})
  normalBuffer({data: normals, usage: 'dynamic'})
  cellBuffer({data: cells, usage: 'dynamic'})
})

const drawMesh = regl({
  frag: `
  precision mediump float;
  varying vec3 fragNormal;
  void main () {
    gl_FragColor = vec4(0.5 + 0.5 * fragNormal, 1);
  }`,

  vert: `
  precision mediump float;
  attribute vec3 position, normal;
  uniform mat4 projection, view;
  varying vec3 fragNormal;
  void main () {
    fragNormal = normal;
    gl_Position = projection * view * vec4(position, 1);
  }`,

  context: {
    t: (props, {time}) => time
  },

  attributes: {
    position: positionBuffer,
    normal: normalBuffer
  },

  uniforms: {
    projection: (props, {viewportWidth, viewportHeight}) =>
      perspective([],
        Math.PI / 4.0,
        viewportWidth / viewportHeight,
        0.01,
        1000.0),

    view: (props, {t}) =>
      lookAt([],
        [radius * Math.cos(t), 0, radius * Math.sin(t)],
        [0, 0, 0],
        [0, 1, 0])
  },

  elements: cellBuffer,

  primitive: 'triangles'
})

regl.frame(() => {
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1
  })

  radius = 0.8 * radius + 0.2 * targetRadius

  drawMesh()
})
