import {limiter} from "@/lib/cron";
import prisma from "@/lib/prisma";
import {stripe} from "@/lib/stripe";
import {getPlanFromPriceId, isUpgrade} from "@/lib/stripe/utils";

import {resend, sendEmail} from "emails";
import UpgradeEmail from "emails/upgrade-email";
import {NextResponse} from "next/server";
import Stripe from "stripe";
import {withAuth} from "@/lib/auth";


// POST /api/callback/stripe – listen to Stripe webhooks
export const POST = (async (req:Request) => {
    const{projectId}=await req.json()

    try {
        const plan = getPlanFromPriceId("price_1LodLoAlJJEpqkPVJdwv5zrG");
        const usageLimit = plan.quota;

        // when the project subscribes to a plan, set their stripe customer ID
        // in the database for easy identification in future webhook events
        // also update the billingCycleStart to today's date

        const project = await prisma.project.update({
            where: {
                id: projectId,
            },
            data: {
                billingCycleStart: new Date().getDate(),
                usageLimit,
                plan: plan.slug,
            },
            select: {
                users: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        const users = project.users.map(({user}) => ({
            name: user.name,
            email: user.email,
        }));

        await Promise.allSettled(
            users.map((user) => {
                limiter.schedule(() =>
                    sendEmail({
                        email: user.email as string,
                        subject: `Thank you for upgrading to Dub ${plan.name}!`,
                        react: UpgradeEmail({
                            name: user.name,
                            email: user.email as string,
                            plan: plan.name,
                        }),
                        marketing: true,
                    }),
                );
            }),
        );


    } catch (error) {

        return new Response(
            'Webhook error: "Webhook handler failed. View logs."',
            {
                status: 400,
            },
        );
    }


    return NextResponse.json({received: true});
})

