import mongoose from 'mongoose'

const configSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  uapiKey: { type: String, default: '' },
  deepseekKey: { type: String, default: '' },
  enabled: { type: Boolean, default: false },
  adminContact: { type: String, default: '' }
})

export default mongoose.model('GlobalConfig', configSchema)
