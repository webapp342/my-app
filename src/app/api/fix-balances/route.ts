import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log(`[FIX BALANCES] Starting balance cleanup for user ${userId}`);

    // 1. Get all balance records for this user
    const { data: allBalances, error: fetchError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .order('token_symbol, created_at');

    if (fetchError) {
      console.error(`[FIX BALANCES] Error fetching balances:`, fetchError);
      throw fetchError;
    }

    console.log(`[FIX BALANCES] Found ${allBalances.length} balance records`);

    // 2. Group by token symbol and consolidate
    const tokenGroups: Record<
      string,
      {
        records: Array<{ id: string; balance: string; token_symbol: string }>;
        totalBalance: number;
      }
    > = {};
    for (const balance of allBalances) {
      const token = balance.token_symbol;
      if (!tokenGroups[token]) {
        tokenGroups[token] = {
          records: [],
          totalBalance: 0,
        };
      }
      tokenGroups[token].records.push(balance);
      tokenGroups[token].totalBalance += parseFloat(balance.balance);
    }

    const results = [];

    // 3. Fix each token group
    for (const [tokenSymbol, group] of Object.entries(tokenGroups)) {
      console.log(
        `[FIX BALANCES] Processing ${tokenSymbol}: ${group.records.length} records, total balance: ${group.totalBalance}`
      );

      if (group.records.length > 1) {
        // Multiple records - consolidate them
        const mainRecord = group.records[0];
        const duplicateIds = group.records
          .slice(1)
          .map((r: { id: string }) => r.id);

        console.log(
          `[FIX BALANCES] Consolidating ${tokenSymbol}: keeping ${mainRecord.id}, deleting ${duplicateIds.length} duplicates`
        );

        // Update main record with total balance
        const { error: updateError } = await supabase
          .from('user_balances')
          .update({
            balance: group.totalBalance,
            last_updated: new Date().toISOString(),
          })
          .eq('id', mainRecord.id);

        if (updateError) {
          console.error(
            `[FIX BALANCES] Failed to update main record for ${tokenSymbol}:`,
            updateError
          );
          throw updateError;
        }

        // Delete duplicate records
        const { error: deleteError } = await supabase
          .from('user_balances')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          console.error(
            `[FIX BALANCES] Failed to delete duplicates for ${tokenSymbol}:`,
            deleteError
          );
          throw deleteError;
        }

        results.push({
          token: tokenSymbol,
          action: 'consolidated',
          recordsRemoved: duplicateIds.length,
          finalBalance: group.totalBalance,
        });
      } else if (group.records.length === 1) {
        // Single record - just ensure balance is correct
        const record = group.records[0];
        results.push({
          token: tokenSymbol,
          action: 'verified',
          recordsRemoved: 0,
          finalBalance: parseFloat(record.balance),
        });
      }
    }

    // 4. Get final state
    const { data: finalBalances } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .order('token_symbol');

    console.log(
      `[FIX BALANCES] ✅ Cleanup completed. Final balances:`,
      finalBalances?.map(b => `${b.token_symbol}: ${b.balance}`)
    );

    return NextResponse.json({
      success: true,
      message: 'Balance cleanup completed',
      results,
      finalBalances: finalBalances?.map(b => ({
        token: b.token_symbol,
        balance: parseFloat(b.balance),
        id: b.id,
      })),
    });
  } catch (error) {
    console.error('[FIX BALANCES] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Balance cleanup failed' },
      { status: 500 }
    );
  }
}
