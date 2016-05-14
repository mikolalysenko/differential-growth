/* globals self */
const seed = require('conway-hart')('I')
const calcNormals = require('angle-normals')
const calcCurvature = require('mesh-mean-curvature')
const refineMesh = require('refine-mesh')
const getBounds = require('bound-points')
const allPairs = require('n-body-pairs')(3, 1024)

const ITERS = 10
const REPEL_RADIUS = 1.0
const EDGE_LENGTH = REPEL_RADIUS
const GROWTH_RATE = 0.01
const REPEL_STRENGTH = 0.005

function sendMesh (mesh) {
  const bounds = getBounds(mesh.positions)
  self.postMessage({
    radius: Math.max(
      Math.abs(bounds[0][0]),
      Math.abs(bounds[0][2]),
      Math.abs(bounds[1][0]),
      Math.abs(bounds[1][2])),
    positions: mesh.positions,
    normals: calcNormals(mesh.cells, mesh.positions),
    cells: mesh.cells
  })
}

function update (mesh) {
  // push along curvature
  const meanCurvature = calcCurvature(mesh.cells, mesh.positions)
  const normals = calcNormals(mesh.cells, mesh.positions)

  // compute edges
  const edges = {}
  mesh.cells.forEach((c) => {
    for (let i = 0; i < 3; ++i) {
      for (let j = 0; j < 3; ++j) {
        edges[i + ',' + j] = true
      }
    }
  })

  // repel all non-adjacent vertices
  const forces = new Float32Array(3 * mesh.positions.length)
  for (let steps = 0; steps < ITERS; ++steps) {
    allPairs(mesh.positions, REPEL_RADIUS, (i, j, d2) => {
      // skip adjacent points
      if (edges[i + ',' + j]) {
        return
      }
      const p = mesh.positions[i]
      const q = mesh.positions[j]
      for (let d = 0; d < 3; ++d) {
        const r = (p[d] - q[d]) / (0.1 + d2)
        forces[3 * i + d] += r
        forces[3 * j + d] -= r
      }
    })
    for (let i = 0; i < mesh.positions.length; ++i) {
      const p = mesh.positions[i]
      const H = meanCurvature[i]
      const N = normals[i]
      const W = GROWTH_RATE * H * Math.random() * Math.random()
      for (let d = 0; d < 3; ++d) {
        p[d] += REPEL_STRENGTH * forces[3 * i + d] + W * N[d]
        forces[3 * i + d] = 0
      }
    }
  }

  // refine
  return refineMesh(mesh.cells, mesh.positions, normals, {
    edgeLength: EDGE_LENGTH
  })
}

module.exports = () => {
  let mesh = seed
  function step () {
    sendMesh(mesh)
    mesh = update(mesh)
    setTimeout(step, 100)
  }
  step()
}
