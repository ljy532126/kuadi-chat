import mongoose from 'mongoose'

const statSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  visits: { type: Number, default: 0 },
  queries: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  byCarrier: { type: mongoose.Schema.Types.Mixed, default: {} }
})

export default mongoose.model('Stat', statSchema)
