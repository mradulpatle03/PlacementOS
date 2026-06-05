const mongoose = require('mongoose');

const interviewSlotSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
    },
    round: {
      type: String,
      enum: ['interview_1', 'interview_2', 'hr'],
      required: true,
    },
    scheduledAt:     { type: Date, required: true },
    durationMinutes: { type: Number, default: 45, min: 5 },
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'online',
    },
    venue:       { type: String, default: '' },
    meetingLink: { type: String, default: '' },

    // capacity — how many students can book this slot
    capacity: { type: Number, default: 1, min: 1 },

    // who has booked this slot
    bookedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    }],

    isActive: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

interviewSlotSchema.index({ drive: 1, round: 1, scheduledAt: 1 });

// virtual — number of seats remaining
interviewSlotSchema.virtual('seatsLeft').get(function () {
  return this.capacity - (this.bookedBy?.length || 0);
});

interviewSlotSchema.set('toJSON', { virtuals: true });
interviewSlotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InterviewSlot', interviewSlotSchema);