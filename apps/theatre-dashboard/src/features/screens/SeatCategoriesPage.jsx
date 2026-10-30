import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import { seatCategoriesApi } from '../../services/api/seat-categories.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DEFAULT_CATEGORY_COLORS = [
  '#A855F7', // Purple
  '#38BDF8', // Sky
  '#FBBF24', // Amber
  '#94A3B8', // Slate
  '#22C55E', // Green
  '#F43F5E'  // Rose
];

export function SeatCategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', color: '#38BDF8' });
  const [formError, setFormError] = useState('');

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['seatCategories'],
    queryFn: () => seatCategoriesApi.getCategories()
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.categories || [];

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingCategory) {
        return seatCategoriesApi.updateCategory(editingCategory._id || editingCategory.id, payload);
      }
      return seatCategoriesApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seatCategories']);
      closeModal();
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to save seat category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => seatCategoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['seatCategories']);
    }
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', code: '', description: '', color: '#38BDF8' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      code: cat.code || '',
      description: cat.description || '',
      color: cat.color || '#38BDF8'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Category name and code are required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Seat Categories & Tiers</h1>
          <p className="text-xs text-slate-400 mt-1">
            Custom seating classes used across your screens and dynamic pricing schemes
          </p>
        </div>

        <Button onClick={openCreateModal} icon={Plus} variant="primary">
          Create Category Tier
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading seat categories..." />
      ) : categories.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <Grid className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Custom Categories Defined</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Default platform categories (VIP, Platinum, Gold, Silver) are available. You can also define custom tiers.
          </p>
          <Button size="sm" variant="secondary" onClick={openCreateModal} icon={Plus}>
            Add Custom Tier
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const id = cat._id || cat.id;
            return (
              <div
                key={id}
                className="bg-cinema-card border border-cinema-border rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#38BDF8' }}
                    />
                    <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-cinema-dark text-slate-300">
                      {cat.code}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-cinema-border flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded hover:bg-cinema-elevated text-slate-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(id)}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Seat Category' : 'Create Seat Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Category Name"
            placeholder="e.g. Royal Balcony Recliners"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Category Code"
            placeholder="e.g. RECLINER, VIP, GOLD"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            disabled={Boolean(editingCategory)}
          />

          <Input
            label="Description (Optional)"
            placeholder="Prime viewing angle with plush motor recliner"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Seat Color Tag
            </label>
            <div className="flex items-center gap-2">
              {DEFAULT_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    formData.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" isLoading={saveMutation.isPending}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SeatCategoriesPage;

