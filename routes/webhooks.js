const express = require('express');
const router = express.Router();
const bolnaService = require('../services/bolnaService');

/**
 * Bolna webhook endpoint for call completion
 */
router.post('/bolna', async (req, res) => {
  try {
    console.log('Webhook received from Bolna:', req.body);

    // Process the webhook data
    const updatedCall = await bolnaService.processCallWebhook(req.body);

    // Send acknowledgment
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      callId: updatedCall?._id
    });
  } catch (error) {
    console.error('Error processing Bolna webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test webhook endpoint
 */
router.post('/test', async (req, res) => {
  try {
    console.log('Test webhook received:', req.body);
    res.status(200).json({
      success: true,
      message: 'Test webhook received'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
