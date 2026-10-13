import { InvitationOut } from '@/modules/invitations/types';
import { TeamMemberContact } from '@/modules/users/types';

export function getInviteUrl(invite: InvitationOut | null, fallbackToken?: string): string {
  const token = invite?.token || fallbackToken || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function generateEmailHtml(
  member: TeamMemberContact,
  invite: InvitationOut | null,
  inviterName: string,
  companyName: string
): string {
  const inviteUrl = getInviteUrl(invite);
  const memberName = member.full_name?.trim() || 'Team Member';
  const cleanInviter = inviterName.trim() || 'Team Administrator';
  const cleanCompany = companyName.trim() || 'Our Company';

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff; padding: 28px; color: #09090b;">
  <div style="border-bottom: 2px solid #09090b; padding-bottom: 14px; margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #71717a;">Latrics Joint Ownership & Drone Survey Portal</div>
    <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #09090b;">Aerostake Team Invitation</h1>
  </div>
  <p style="font-size: 14px; line-height: 1.6; color: #18181b; margin: 0 0 14px 0;">
    Hello <strong>${memberName}</strong>,
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px 0;">
    <strong>${cleanInviter}</strong> has added you to the <strong>${cleanCompany}</strong> team workspace on Aerostake. You have been granted access to collaborate on project requests, planning reviews, flight updates, and deliverables.
  </p>
  
  <!-- Outlook-Bulletproof Coloured Button (Preserves background colour across Outlook Web, Outlook Desktop, Gmail, and Yahoo) -->
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; margin: 24px 0;">
    <tbody>
      <tr>
        <td align="center" valign="middle" bgcolor="#09090b" style="background-color: #09090b; border: 1px solid #09090b; border-radius: 6px; padding: 13px 28px; text-align: center;">
          <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteUrl}" style="height:44px;v-text-anchor:middle;width:260px;" stroke="f" fillcolor="#09090b">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:-apple-system,sans-serif;font-size:14px;font-weight:bold;">Accept Invitation &amp; Set Password</center>
          </v:rect>
          <![endif]-->
          <a href="${inviteUrl}" target="_blank" style="color: #ffffff !important; text-decoration: none !important; font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
            <span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Accept Invitation &amp; Set Password</span>
          </a>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="background-color: #f4f4f5; border-left: 4px solid #09090b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #18181b; font-weight: 700;">Important Validity Notice:</p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #52525b; line-height: 1.5;">This invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
  <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 0;">
    If the button above does not work, copy and paste this URL into your web browser:<br />
    <a href="${inviteUrl}" style="color: #09090b; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
  </p>
</div>`;
}

export function generateEmailPlainText(
  member: TeamMemberContact,
  invite: InvitationOut | null,
  inviterName: string,
  companyName: string
): string {
  const inviteUrl = getInviteUrl(invite);
  const memberName = member.full_name?.trim() || 'Team Member';
  const cleanInviter = inviterName.trim() || 'Team Administrator';
  const cleanCompany = companyName.trim() || 'Our Company';

  return `Latrics Joint Ownership & Drone Survey Portal\nAerostake Workspace Invitation\n\nHello ${memberName},\n\n${cleanInviter} has invited you to collaborate on the ${cleanCompany} workspace for drone survey project requests, flight reviews, and deliverables.\n\n[Accept Invitation & Set Password](${inviteUrl})\n\nImportant Validity Notice:\nThis invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.\n\nIf the button above does not work, copy and paste this URL into your web browser:\n${inviteUrl}\n`;
}

export type EmailPlatformType = 'gmail' | 'outlook-live' | 'outlook-office' | 'yahoo' | 'mailto';

export async function copyFormattedEmailLayout(
  member: TeamMemberContact,
  invite: InvitationOut | null,
  inviterName: string,
  companyName: string
): Promise<void> {
  const html = generateEmailHtml(member, invite, inviterName, companyName);
  const plain = generateEmailPlainText(member, invite, inviterName, companyName);
  try {
    if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
  } catch {
    await navigator.clipboard.writeText(plain);
  }
}

export function launchEmailPlatform(
  platform: EmailPlatformType,
  member: TeamMemberContact,
  invite: InvitationOut | null,
  inviterName: string,
  companyName: string
) {
  // Pre-copy formatted email layout
  copyFormattedEmailLayout(member, invite, inviterName, companyName).catch((err) =>
    console.warn('Failed copying HTML to clipboard:', err)
  );

  const cleanCompany = companyName.trim() || 'Our Company';
  const subject = `Invitation to join ${cleanCompany} on Aerostake`;
  const to = member.email.trim();
  const body = generateEmailPlainText(member, invite, inviterName, companyName);

  if (platform === 'gmail') {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  } else if (platform === 'outlook-live') {
    window.open(
      `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  } else if (platform === 'outlook-office') {
    window.open(
      `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  } else if (platform === 'yahoo') {
    window.open(
      `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  } else if (platform === 'mailto') {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
