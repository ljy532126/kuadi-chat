import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true
  },
  password: {
    type: String, required: true
  },
  role: {
    type: String, enum: ['user', 'admin'], default: 'user'
  },
  useGlobal: {
    type: Boolean, default: false
  },
  lastActive: {
    type: Date, default: Date.now
  },
  createdAt: {
    type: Date, default: Date.now
  }
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password)
}

export default mongoose.model('User', userSchema)
