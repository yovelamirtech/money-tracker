import { useState } from 'react'
import CategoryForm, { type CategoryValues } from '../components/CategoryForm'
import CategoryIcon from '../components/CategoryIcon'
import ScreenHeader from '../components/ScreenHeader'
import SegmentedControl from '../components/SegmentedControl'
import { card, iconButton, sectionTitle } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { isOtherCategory } from '../lib/categories'
import type { Category, Transaction, TransactionType } from '../lib/types'

interface CategoriesScreenProps {
  categories: Category[]
  transactions: Transaction[]
  onAdd: (type: TransactionType, values: CategoryValues) => void
  onUpdate: (id: string, values: CategoryValues) => void
  onDelete: (id: string) => void
  onBack: () => void
}

export default function CategoriesScreen({
  categories,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
  onBack,
}: CategoriesScreenProps) {
  const { t, categoryName } = useI18n()
  const [type, setType] = useState<TransactionType>('expense')
  const [editingId, setEditingId] = useState<string | null>(null)
  const ofType = categories.filter((c) => c.type === type)

  function confirmDelete(category: Category) {
    const count = transactions.filter((tx) => tx.categoryId === category.id).length
    if (window.confirm(t('confirmDeleteCategory', { name: categoryName(category), count }))) onDelete(category.id)
  }

  function handleUpdate(category: Category, values: CategoryValues) {
    // Saving a translated default name unchanged keeps the original stored name.
    const name = values.name === categoryName(category) ? category.name : values.name
    onUpdate(category.id, { ...values, name })
    setEditingId(null)
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('categoriesTitle')} onBack={onBack} />

      <SegmentedControl
        label={t('categoryTabs')}
        value={type}
        onChange={(next) => {
          setType(next)
          setEditingId(null)
        }}
        options={[
          { value: 'expense', label: t('expenses') },
          { value: 'income', label: t('income') },
        ]}
      />

      <ul aria-label={t('categoriesTitle')} className="divide-y divide-line rounded-2xl bg-card shadow-sm">
        {ofType.map((category) => {
          const name = categoryName(category)
          return (
            <li key={category.id} className="p-3">
              {editingId === category.id ? (
                <CategoryForm
                  categories={categories}
                  type={type}
                  initial={category}
                  initialName={name}
                  submitLabel={t('save')}
                  onSubmit={(values) => handleUpdate(category, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <CategoryIcon category={category} />
                  <span className="flex-1 font-medium">{name}</span>
                  <button
                    type="button"
                    aria-label={t('editCategory', { name })}
                    onClick={() => setEditingId(category.id)}
                    className={iconButton}
                  >
                    ✎
                  </button>
                  {!isOtherCategory(category.id) && (
                    <button
                      type="button"
                      aria-label={t('deleteCategory', { name })}
                      onClick={() => confirmDelete(category)}
                      className={`${iconButton} hover:bg-danger-soft hover:text-expense`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <section aria-labelledby="add-category-title" className={card}>
        <h2 id="add-category-title" className={sectionTitle}>
          {t('addCategory')}
        </h2>
        <CategoryForm
          key={type}
          categories={categories}
          type={type}
          submitLabel={t('addCategory')}
          onSubmit={(values) => onAdd(type, values)}
        />
      </section>
    </main>
  )
}
