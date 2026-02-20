import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useBenches() {
  const [benches, setBenches] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBenches = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('benches')
      .select(`
        *,
        reviews ( id, rating, comment, user_id, created_at )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBenches(data.map(b => ({
        ...b,
        ratings: b.reviews?.map(r => r.rating) || [],
        comments: b.reviews?.map(r => ({
          id: r.id,
          user: r.user_id,
          text: r.comment,
          rating: r.rating,
          date: new Date(r.created_at).toLocaleDateString('de-DE'),
        })) || [],
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBenches()
  }, [fetchBenches])

  const addBench = async ({ title, description, lat, lng, photoFile, userId }) => {
    let photo_url = null

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('bench-photos')
        .upload(fileName, photoFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('bench-photos')
          .getPublicUrl(fileName)
        photo_url = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('benches')
      .insert({ title, description, lat, lng, photo_url, user_id: userId })
      .select()
      .single()

    if (error) throw error
    await fetchBenches()
    return data
  }

  const addReview = async ({ benchId, userId, rating, comment }) => {
    const { error } = await supabase
      .from('reviews')
      .insert({ bench_id: benchId, user_id: userId, rating, comment })

    if (error) throw error
    await fetchBenches()
  }

  return { benches, loading, fetchBenches, addBench, addReview }
}
