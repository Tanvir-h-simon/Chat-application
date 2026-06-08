const mongoose = require('mongoose');

const peopleSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true
        },
        age: {
            type: Number,
            required: true,
            min: 0
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true
        },
        mobile: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        avatar: {
            type: String
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },

        // Failed-login lockout state (regular users only). Managed by the
        // login controller; admins are never locked out.
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        },
    },
    // Add timestamps to the schema
    {
        timestamps: true
    }
);

const People = mongoose.model('People', peopleSchema);

module.exports = People;