import mongoose from 'mongoose'

const setupSchema = new mongoose.Schema({
  _id: { type: String, default: 'setup' },
  initialized: { type: Boolean, default: false },
  installedAt: { type: Date },
  version: { type: String, default: '2.0' }
})

export default mongoose.model('Setup', setupSchema)
