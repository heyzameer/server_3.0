import { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { asyncHandler } from "../utils/errorHandler";
import { injectable, inject } from "tsyringe";
import { IUserService } from "../interfaces/IService/IUserService";
import { ResponseMessages } from "../enums/ResponseMessages";
import { HttpStatus } from "../enums/HttpStatus";

@injectable()
export class WishlistController {
    constructor(@inject("UserService") private userService: IUserService) { }

    /**
     * Toggle a property in the user's wishlist.
     */
    toggleWishlist = asyncHandler(
        async (req: Request, res: Response, _next: NextFunction) => {
            const userId = req.user!.userId;
            const { propertyId } = req.body;

            if (!propertyId) {
                return sendError(res, "Property ID is required", HttpStatus.BAD_REQUEST);
            }

            const result = await this.userService.toggleWishlist(userId, propertyId);

            sendSuccess(res, ResponseMessages.WISHLIST_TOGGLED, result);
        }
    );

    /**
     * Get the current user's wishlist.
     */
    getWishlist = asyncHandler(
        async (req: Request, res: Response, _next: NextFunction) => {
            const userId = req.user!.userId;
            const wishlist = await this.userService.getWishlist(userId);

            sendSuccess(res, ResponseMessages.WISHLIST_RETRIEVED, { wishlist });
        }
    );
}
