import { supabaseAdmin } from '../config/supabase.js';

export const getCategories = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let query = supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('name')
      .range(from, to);

    if (error) throw error;

    // Get product counts for each category
    const categories = data || [];
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const { count: productCount } = await supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
        return { ...cat, product_count: productCount || 0 };
      })
    );

    res.json({
      items: categoriesWithCounts,
      total: count || 0,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*, products(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Category not found' });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Category name already exists' });
      }
      throw error;
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE',
      entity: 'categories',
      entity_id: data.id,
      details: { name },
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Category name already exists' });
      }
      throw error;
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE',
      entity: 'categories',
      entity_id: id,
      details: { name },
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if products use this category
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${count} product(s) are using this category. Remove or reassign them first.`,
      });
    }

    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DELETE',
      entity: 'categories',
      entity_id: id,
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const restoreCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('categories')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Category restored' });
  } catch (error) {
    next(error);
  }
};