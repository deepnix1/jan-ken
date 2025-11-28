/**
 * Supabase Connection Test Utility
 * Use this to diagnose Supabase connection issues
 */

import { supabase } from './supabase'

export async function testSupabaseConnection(): Promise<{
  success: boolean
  error?: string
  details?: any
}> {
  try {
    console.log('[Supabase Test] Testing connection...')
    console.log('[Supabase Test] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iophfhfnctqufqsmunyz.supabase.co')
    console.log('[Supabase Test] Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('[Supabase Test] Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0)
    
    // Test 1: Simple count query
    const { count, error: countError } = await supabase
      .from('matchmaking_queue')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      return {
        success: false,
        error: `Count query failed: ${countError.message || countError.code || 'Unknown error'}`,
        details: {
          code: countError.code,
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
        },
      }
    }
    
    console.log('[Supabase Test] ✅ Count query successful:', count)
    
    // Test 2: Try a simple insert (will be rolled back)
    const testAddress = '0x0000000000000000000000000000000000000000'
    const { error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({
        player_address: testAddress,
        bet_level: 999, // Non-existent bet level
        bet_amount: '0',
        status: 'waiting',
      })
      .select()
    
    // Delete test entry if it was created
    if (!insertError) {
      await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('player_address', testAddress)
    }
    
    if (insertError && insertError.code !== '23505') { // 23505 = unique constraint, which is OK for test
      return {
        success: false,
        error: `Insert test failed: ${insertError.message || insertError.code || 'Unknown error'}`,
        details: {
          code: insertError.code,
          message: insertError.message,
        },
      }
    }
    
    console.log('[Supabase Test] ✅ Insert test successful')
    
    return {
      success: true,
      details: {
        count,
        insertTest: insertError ? 'Constraint error (expected)' : 'Success',
      },
    }
  } catch (error: any) {
    console.error('[Supabase Test] ❌ Connection test failed:', error)
    return {
      success: false,
      error: error?.message || String(error),
      details: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack?.split('\n').slice(0, 5),
      },
    }
  }
}



