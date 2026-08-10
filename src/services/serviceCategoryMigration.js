import { Service } from '../models/Service.js';
import { Category } from '../models/Category.js';
import { SubCategory } from '../models/SubCategory.js';

/**
 * Idempotent, non-destructive migration for the Category -> Sub-Category -> Service
 * hierarchy. Existing services that only carry a legacy `category` string are
 * backfilled with a matching categoryId (and subCategoryId when a sub-category with
 * the same name exists under that category). Records that cannot be matched are left
 * untouched and remain "uncategorized" until an admin assigns them. No data is ever
 * deleted or invented.
 */
export async function migrateServicesToCategories() {
  try {
    const [categories, subCategories] = await Promise.all([
      Category.find({}).select('_id name').lean(),
      SubCategory.find({}).select('_id categoryId name').lean(),
    ]);

    if (categories.length === 0) {
      console.log('[Migration] No categories exist yet — skipping service category backfill.');
      return;
    }

    const catByName = new Map(categories.map((c) => [String(c.name).toLowerCase(), c._id]));
    const subByNameByCat = new Map();
    for (const s of subCategories) {
      const key = `${String(s.categoryId)}::${String(s.name).toLowerCase()}`;
      subByNameByCat.set(key, s._id);
    }

    const services = await Service.find({
      categoryId: null,
      category: { $ne: null, $ne: '' },
    }).select('_id category').lean();

    let updated = 0;
    for (const svc of services) {
      const catId = catByName.get(String(svc.category).toLowerCase());
      if (!catId) continue;
      const subId = subByNameByCat.get(`${String(catId)}::${String(svc.category).toLowerCase()}`) || null;
      await Service.updateOne({ _id: svc._id }, { $set: { categoryId: catId, subCategoryId: subId } });
      updated += 1;
    }

    if (updated > 0) {
      console.log(`[Migration] Backfilled category references for ${updated} existing service(s).`);
    }
  } catch (err) {
    console.warn('[Migration] Service category backfill failed (non-fatal):', err.message);
  }
}
