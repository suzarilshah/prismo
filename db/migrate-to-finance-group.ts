/**
 * Migration Script: Migrate existing user data to Finance Groups
 * 
 * This script:
 * 1. Creates a "Shah's Finance" group for user suzarilshah@gmail.com
 * 2. Adds the user as owner and member of the group
 * 3. Updates all existing data (transactions, categories, etc.) to belong to this group
 * 
 * Run with: npx tsx db/migrate-to-finance-group.ts
 */

import { db } from "./index";
import {
  users,
  financeGroups,
  financeGroupMembers,
  categories,
  transactions,
  vendors,
  subscriptions,
  goals,
  budgets,
  commitments,
} from "./schema";
import { eq } from "drizzle-orm";

async function migrateUserToFinanceGroup() {
  const userEmail = "suzarilshah@gmail.com";
  
  console.log(`\n🚀 Starting migration for user: ${userEmail}\n`);
  
  try {
    // 1. Find the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return;
    }
    
    console.log(`✅ Found user: ${user.name || user.email} (ID: ${user.id})`);
    
    // 2. Check if finance group already exists
    const [existingGroup] = await db
      .select()
      .from(financeGroups)
      .where(eq(financeGroups.ownerId, user.id))
      .limit(1);
    
    let financeGroupId: string;
    
    if (existingGroup) {
      console.log(`⚠️ Finance group already exists: ${existingGroup.name}`);
      financeGroupId = existingGroup.id;
    } else {
      // 3. Create "Shah's Finance" group
      const [newGroup] = await db
        .insert(financeGroups)
        .values({
          ownerId: user.id,
          name: "Shah's Finance",
          description: "Personal finance management workspace",
          type: "personal",
          currency: "MYR",
          isDefault: true,
          isActive: true,
          enableForecasting: true,
          forecastingPeriod: 12,
          totalMembers: 1,
        })
        .returning();
      
      financeGroupId = newGroup.id;
      console.log(`✅ Created finance group: ${newGroup.name} (ID: ${financeGroupId})`);
      
      // 4. Add user as owner member
      await db.insert(financeGroupMembers).values({
        financeGroupId: financeGroupId,
        userId: user.id,
        role: "owner",
        permissions: {
          viewTransactions: true,
          editTransactions: true,
          viewBudgets: true,
          editBudgets: true,
          viewGoals: true,
          editGoals: true,
          viewTax: true,
          editTax: true,
          viewCommitments: true,
          editCommitments: true,
          viewReports: true,
          exportData: true,
          inviteMembers: true,
          manageMembers: true,
        },
        status: "active",
      });
      
      console.log(`✅ Added user as owner member`);
    }
    
    // 5. Update all categories to belong to this group
    const categoriesResult = await db
      .update(categories)
      .set({ financeGroupId: financeGroupId })
      .where(eq(categories.userId, user.id))
      .returning({ id: categories.id });
    
    console.log(`✅ Updated ${categoriesResult.length} categories`);
    
    // 6. Update all transactions to belong to this group
    const transactionsResult = await db
      .update(transactions)
      .set({ financeGroupId: financeGroupId })
      .where(eq(transactions.userId, user.id))
      .returning({ id: transactions.id });
    
    console.log(`✅ Updated ${transactionsResult.length} transactions`);
    
    // 7. Update all vendors to belong to this group
    const vendorsResult = await db
      .update(vendors)
      .set({ financeGroupId: financeGroupId })
      .where(eq(vendors.userId, user.id))
      .returning({ id: vendors.id });
    
    console.log(`✅ Updated ${vendorsResult.length} vendors`);
    
    // 8. Update all subscriptions to belong to this group
    const subscriptionsResult = await db
      .update(subscriptions)
      .set({ financeGroupId: financeGroupId })
      .where(eq(subscriptions.userId, user.id))
      .returning({ id: subscriptions.id });
    
    console.log(`✅ Updated ${subscriptionsResult.length} subscriptions`);
    
    // 9. Update all goals to belong to this group
    const goalsResult = await db
      .update(goals)
      .set({ financeGroupId: financeGroupId })
      .where(eq(goals.userId, user.id))
      .returning({ id: goals.id });
    
    console.log(`✅ Updated ${goalsResult.length} goals`);
    
    // 10. Update all budgets to belong to this group
    const budgetsResult = await db
      .update(budgets)
      .set({ financeGroupId: financeGroupId })
      .where(eq(budgets.userId, user.id))
      .returning({ id: budgets.id });
    
    console.log(`✅ Updated ${budgetsResult.length} budgets`);
    
    // 11. Update all commitments to belong to this group
    const commitmentsResult = await db
      .update(commitments)
      .set({ financeGroupId: financeGroupId })
      .where(eq(commitments.userId, user.id))
      .returning({ id: commitments.id });
    
    console.log(`✅ Updated ${commitmentsResult.length} commitments`);
    
    console.log(`\n🎉 Migration complete for ${userEmail}!`);
    console.log(`   Finance Group: Shah's Finance (${financeGroupId})`);
    console.log(`   All data has been associated with this workspace.\n`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
  
  process.exit(0);
}

migrateUserToFinanceGroup();
