export type FirstMessageInput = {
  theirFirstName: string;
  viewerFirstName?: string;
  score: number | null;
  coveredSkills: string[];
  sameStage?: string;
  sameIndustry?: string;
  talk?: string;
};

export function firstMessage(input: FirstMessageInput, lang: 'en' | 'el'): string {
  const name = input.theirFirstName.trim().slice(0, 60);
  const viewer = input.viewerFirstName?.trim().slice(0, 60);
  const skills = input.coveredSkills.filter(Boolean).slice(0, 2).map((skill) => skill.slice(0, 50));
  const talk = input.talk?.trim().slice(0, 120);
  const stage = input.sameStage?.trim().slice(0, 60);
  const industry = input.sameIndustry?.trim().slice(0, 60);
  const lines = lang === 'el'
    ? [
      `Γεια σας${name ? ` ${name}` : ''},`,
      input.score == null ? 'Το CoFounderBay μάς έφερε δίπλα δίπλα.' : `Το CoFounderBay μάς αντιστοίχισε με ${input.score}%.`,
      skills.length ? `Φέρνετε ${skills.join(' και ')} — ακριβώς ό,τι αναζητώ.` : '',
      stage ? `Βρισκόμαστε και οι δύο στο στάδιο ${stage}.` : '',
      industry ? `Δραστηριοποιούμαστε και οι δύο στον κλάδο ${industry}.` : '',
      talk ? `Θα ήθελα να ακούσω πώς υλοποιήσατε ${talk}.` : '',
      'Θα σας βόλευε μια κλήση 20 λεπτών αυτή την εβδομάδα;',
      viewer ?? '',
    ]
    : [
      `Hi${name ? ` ${name}` : ''},`,
      input.score == null ? 'CoFounderBay put us side by side.' : `CoFounderBay matched us at ${input.score}%.`,
      skills.length ? `You bring ${skills.join(' and ')} — exactly what I am looking for.` : '',
      stage ? `We are both at the ${stage} stage.` : '',
      industry ? `We are both building in ${industry}.` : '',
      talk ? `I would like to hear how you have shipped ${talk}.` : '',
      'Would a 20-minute call this week work?',
      viewer ?? '',
    ];
  return lines.filter(Boolean).join('\n\n').slice(0, 600);
}
