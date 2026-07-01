import mongoose from 'mongoose'

const queryLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  trackingNumber: { type: String, required: true },
  carrier: { type: String, default: '' },
  success: { type: Boolean, default: false },
  ip: { type: String },
  isGuest: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
})

queryLogSchema.index({ createdAt: -1 })
queryLogSchema.index({ userId: 1 })

export default mongoose.model('QueryLog', queryLogSchema)
