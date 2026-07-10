import { supabaseAdmin as supabase } from '../config/supabase.js';

export const getSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    // Convert array of {key, value} to object
    const settings = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let updates = {};

    // Support per-key updates: PUT /settings/:key with body { key, value }
    if (req.params.key) {
      const value = req.body && ('value' in req.body ? req.body.value : req.body);
      updates[req.params.key] = value;
    } else {
      updates = req.body; // Bulk: { key: value, ... }
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No settings provided' });
    }

    // Upsert each key
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'settings',
      entity_id: null,
      details: { keys: Object.keys(updates) },
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};