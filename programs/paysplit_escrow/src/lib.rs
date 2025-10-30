use anchor_lang::prelude::*;

declare_id!("EsCRowRent1111111111111111111111111111111111"); // replace with your real program id

#[program]
pub mod paysplit_escrow {
    use super::*;

    // create new escrow
    pub fn initialize(ctx: Context<Initialize>, landlord: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.landlord = landlord;
        escrow.tenant = *ctx.accounts.tenant.key;
        escrow.released = false;
        Ok(())
    }

    // deposit rent (tenant pays)
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        **ctx.accounts.tenant.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    // release to landlord
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::AlreadyReleased);
        let amount = ctx.accounts.escrow.to_account_info().lamports();
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.landlord.to_account_info().try_borrow_mut_lamports()? += amount;
        escrow.released = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = tenant, space = 8 + 64)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub tenant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub tenant: Signer<'info>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: landlord wallet
    #[account(mut)]
    pub landlord: UncheckedAccount<'info>,
}

#[account]
pub struct Escrow {
    pub landlord: Pubkey,
    pub tenant: Pubkey,
    pub released: bool,
}

#[error_code]
pub enum EscrowError {
    #[msg("Already released")]
    AlreadyReleased,
}

