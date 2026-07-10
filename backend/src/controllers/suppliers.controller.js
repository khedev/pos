import { supabaseAdmin } from '../config/supabase.js';

export const getSuppliers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let query = supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('name')
      .range(from, to);

    if (error) throw error;

    res.json({
      items: data || [],
      total: count || 0,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*, products(name, barcode), receiving(receiving_number, total_cost, created_at)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Supplier not found' });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const { name, contact_person, email, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({ name, contact_person, email, phone, address })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE',
      entity: 'suppliers',
      entity_id: data.id,
      details: { name },
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_person, email, phone, address } = req.body;

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .update({
        name, contact_person, email, phone, address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'suppliers',
      entity_id: id,
      details: { name },
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin.from('suppliers').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DELETE',
      entity: 'suppliers',
      entity_id: id,
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};